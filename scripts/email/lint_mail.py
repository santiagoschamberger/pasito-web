#!/usr/bin/env python3
"""Checks rendered Pasito email. Business promises and device behavior need evidence.
Never request action URLs: fetching an auth link could consume its token.
"""
import argparse
import html
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import urllib.request
from urllib.parse import urlsplit, parse_qs

LOGO = 'https://mail.pasito.app/uploads/pasito-logo-blanco.png'
class MailParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.images=[]; self.links=[]; self.tags=[]; self.meta=[]; self.words=[]; self.anchor=None
    def handle_starttag(self, tag, attrs):
        d=dict(attrs);self.tags.append((tag,d))
        if tag=='img': self.images.append(d)
        if tag=='meta': self.meta.append(d)
        if tag=='a': self.anchor={'url':d.get('href',''),'label':''};self.links.append(self.anchor)
    def handle_endtag(self, tag):
        if tag=='a': self.anchor=None
    def handle_data(self, data):
        self.words.append(data)
        if self.anchor is not None: self.anchor['label']+=data

def lint_email(h, subject, text, campaign=False, no_action=False, private_link=False, external=False, headers=None):
    p=MailParser();p.feed(h);errors=[]
    def need(ok,msg):
        if not ok:errors.append(msg)
    need(h.lstrip().lower().startswith('<!doctype html'), 'falta DOCTYPE')
    need(any(t=='html' and d.get('lang')=='es' for t,d in p.tags),'falta lang=es')
    need(any(d.get('name')=='viewport' for d in p.meta),'falta viewport')
    need(not any(t in ('script','form','input','video','button','iframe') for t,d in p.tags),'elemento incompatible con mail')
    need(not re.search(r'display\s*:\s*(flex|grid)',h,re.I),'usa flex o grid')
    need(len(h.encode())<100000,'supera 100 KB')
    need('bgcolor="#006D42"' in h,'falta header verde')
    need('width="560"' in h,'ancho distinto de 560')
    need('font-size:16px;line-height:26px' in h,'tipografía distinta de 16/26')
    need('prefers-color-scheme: dark' in h,'falta modo oscuro')
    need(len(p.images)==1,'debe haber una sola imagen: el logo')
    for i in p.images:
        need(i.get('src')==LOGO,'el logo debe usar la URL PNG canónica')
        need(i.get('width')=='76' and i.get('height')=='18' and i.get('alt')=='Pasito','dimensiones o alt del logo incorrectos')
    words=' '.join(p.words)
    need(all(x in words for x in ['Caminando pasan cosas lindas,','Santi','Pasito · Buenos Aires, Argentina']),'falta firma o dirección')
    need(bool(text.strip()),'falta texto plano')
    need('Caminando pasan cosas lindas,\nSanti\nPasito' in text,'falta firma en texto plano')
    need(bool(subject.strip()) and len(subject)<=50,'asunto obligatorio de hasta 50 caracteres')
    for value in (h,text,subject):
        need(not re.search(r'\{\{|\}\}|\b(?:undefined|None|null)\b',value),'dato sin renderizar')
    need(not re.search(r'Hola\s*,|Hola\s{2,}|\b(?:en|de)\s+\.',words),'hueco de personalización')
    pre=re.search(r'<div style="display:none[^>]*>(.*?)</div>',h,re.S)
    preview=html.unescape(re.sub('<[^>]+>','',pre.group(1))) if pre else ''
    preview=re.sub('[\u034f\u200c\u00a0]','',preview).strip()
    need(0<len(preview)<=90,'preheader obligatorio de hasta 90 caracteres')
    primary=[]; unsubscribe=[]
    for link in p.links:
        raw=link['url'];u=urlsplit(raw);host=u.hostname or ''
        need(u.scheme in ('https','mailto') and not u.username and not u.password,'enlace sin HTTPS o mailto')
        if re.search('baja|dejar de recibir',link['label'],re.I):unsubscribe.append(link);continue
        need(u.path!='/actualizar','/actualizar no abre la pantalla de la app')
        if u.scheme=='mailto':continue
        trusted=host in ('pasito.app','www.pasito.app','partners.pasito.app','eventos.pasito.app')
        need(trusted or external,'dominio externo sin declarar su función')
        if host in ('pasito.app','www.pasito.app') and not private_link:
            need(bool(re.fullmatch(r'/abrir/(inicio|premios|reservas|entradas)',u.path)),'link a app fuera de /abrir/<pantalla>')
        if not private_link:
            q=parse_qs(u.query)
            need(q.get('utm_source')==['email'] and bool(q.get('utm_campaign',[''])[0]) and bool(q.get('utm_content',[''])[0]),'enlace principal sin UTM completos')
        primary.append(link)
    need(no_action or len(primary)==1,'debe haber un link principal (o declarar mail sin acción)')
    need(not no_action or not primary,'sin-accion solo se permite si no hay CTA web')
    if campaign:
        need(not no_action and not private_link,'campaña requiere CTA medible')
        need(bool(unsubscribe),'campaña sin link visible de baja')
        need(headers is not None,'faltan encabezados de campaña')
        if headers is not None:
            normalized={k.lower():v for k,v in headers.items()}
            need('https://' in normalized.get('list-unsubscribe',''),'falta List-Unsubscribe HTTPS')
            need(normalized.get('list-unsubscribe-post')=='List-Unsubscribe=One-Click','falta baja en un clic')
    return list(dict.fromkeys(errors))

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('html');ap.add_argument('--asunto',required=True);ap.add_argument('--texto',required=True)
    ap.add_argument('--campania',action='store_true');ap.add_argument('--sin-accion',action='store_true',help='Factura adjunta, OTP o credencial sin CTA web')
    ap.add_argument('--link-privado',action='store_true',help='Link firmado o de autenticación, preservado sin agregar tracking')
    ap.add_argument('--enlace-externo',action='store_true',help='Emisión de entradas o coordinación, con dominio revisado')
    ap.add_argument('--headers',help='JSON de encabezados MIME reales para campañas');ap.add_argument('--check-logo',action='store_true')
    a=ap.parse_args();import json
    errors=lint_email(Path(a.html).read_text(),a.asunto,Path(a.texto).read_text(),a.campania,a.sin_accion,a.link_privado,a.enlace_externo,json.loads(Path(a.headers).read_text()) if a.headers else None)
    if a.check_logo:
        try:
            with urllib.request.urlopen(LOGO,timeout=15) as r:
                if r.headers.get_content_type()!='image/png' or not r.read(8).startswith(b'\x89PNG\r\n\x1a\n'):errors.append('logo público no es PNG')
        except Exception as e:errors.append('logo público no disponible: '+str(e))
    for error in errors:print('ERROR:',error)
    print('OK — controles estáticos' if not errors else f'{len(errors)} error(es)')
    return bool(errors)
if __name__=='__main__':sys.exit(main())
