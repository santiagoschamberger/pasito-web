import styles from '@/app/legal.module.css'

function formatBlock(block: string) {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
}

function isHeading(value: string) {
  return /^(\([ivxlcdm]+\)|\d+\.-|vi\.\d+\.|[a-z]\)\s*[A-ZÁÉÍÓÚÑ]{3,})/i.test(value)
}

export function LegalDocument({ content }: { content: string }) {
  const blocks = content
    .replace(/\n\s*\d+\s*\n/g, '\n')
    .split(/\n\s*\n/)
    .map(formatBlock)
    .filter(Boolean)

  return (
    <div className={styles.legalDocument}>
      {blocks.map((block, index) => {
        if (index === 0) return <p className={styles.documentTitle} key={`${index}-${block.slice(0, 20)}`}>{block}</p>
        if (isHeading(block)) return <h2 key={`${index}-${block.slice(0, 20)}`}>{block}</h2>
        if (/^Última actualización:/i.test(block)) return <p className={styles.lastUpdated} key={`${index}-${block.slice(0, 20)}`}>{block}</p>
        return <p key={`${index}-${block.slice(0, 20)}`}>{block}</p>
      })}
    </div>
  )
}
