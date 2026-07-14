export type CountDatum = {
  label: string
  count: number
}

export type TrendDatum = {
  month: string
  count: number
}

export type DailyTrendDatum = {
  date: string
  count: number
}

export type ActivityTimelineDatum = {
  date: string
  kind: 'challenge_start' | 'challenge_end' | 'context'
  label: string
  detail: string | null
}

export type TopRewardDatum = CountDatum & {
  partner: string
}

export type NotificationDatum = {
  type: string
  sent: number
  opened: number
}

export type TopChallengeDatum = {
  label: string
  brand: string
  participants: number
  instagramShares: number
  winners: number
  validatedSteps: number
}

export type BrandDataSnapshotPayload = {
  countryCode: 'AR' | 'UY'
  countryName: string
  currency: 'ARS' | 'UYU'
  headline: {
    registeredUsers: number
    activeUsers30d: number
    newUsers30d: number
    redeemingUsers: number
    redemptionsTotal: number
    redemptions30d: number
    activePartners: number
    activeRewards: number
    averageRedeemedValue: number | null
    medianRedeemedValue: number | null
    valueSampleSize: number
    averagePasitosSpent: number | null
    redeemingUsers30d: number
    repeatRedeemers: number
  }
  dataCoverage: {
    ageUsers: number
    locationUsers: number
    interestUsers: number
  }
  ageDistribution: CountDatum[]
  redeemerAgeDistribution: CountDatum[]
  locations: {
    provinces: CountDatum[]
    cities: CountDatum[]
    neighborhoods: CountDatum[]
  }
  redeemerNeighborhoods: CountDatum[]
  interests: CountDatum[]
  redeemerInterests: CountDatum[]
  favoriteCategories: CountDatum[]
  redemptionCategories: CountDatum[]
  redemptionTrend: TrendDatum[]
  redemptionFrequency: CountDatum[]
  topRewards: TopRewardDatum[]
  topPartners: CountDatum[]
  engagement: {
    appOpenDays30d: number
    averageOpenDaysPerActive: number
    recurrentUsers30d: number
    validatedSteps30d: number
    averageStepsPerActiveDay: number
    pasitosEarned30d: number
    pushReachableUsers: number
    notificationsSent30d: number
    notificationsOpened30d: number
  }
  dailyActiveTrend: DailyTrendDatum[]
  activityTimeline: ActivityTimelineDatum[]
  notificationBreakdown: NotificationDatum[]
  challengePerformance: {
    challenges: number
    participantUsers: number
    participations: number
    instagramShares: number
    winners: number
    validatedSteps: number
    topChallenges: TopChallengeDatum[]
  }
  marketing: {
    dauLastCompleteDay: number
    averageDau30d: number
    peakDau30d: number
    wau7d: number
    mau30d: number
    activePersonDays30d: number
    stickinessDauMau: number
    dauChange1d: number | null
    wauChange7d: number | null
    mauChange30d: number | null
    pushSendsLastCompleteDay: number
    averagePushSendsPerDay: number
    pushSends30d: number
    pushOpens30d: number
    catalogDetailViewsDaily: number | null
    catalogDetailViews30d: number | null
    catalogClicksDaily: number | null
    catalogClicks30d: number | null
    catalogClickersDaily: number | null
    catalogCoverageStartDate: string | null
    catalogDataThroughDate: string | null
    catalogMetricsRefreshedAt: string | null
    catalogMeasurementStatus: 'pending_firebase_mixpanel_export' | 'connected'
    mixpanelSessions30d: number
    mixpanelAverageSessionSeconds: number | null
    mixpanelFirstOpens30d: number
    mixpanelSignUps30d: number
    mixpanelMapMarkerTaps30d: number
    mixpanelFilterChanges30d: number
    mixpanelExternalLinkOpens30d: number
    mixpanelSocialShares30d: number
    mixpanelReservationRequests30d: number
    mixpanelReservationContactOpens30d: number
    mixpanelPlatformSessions: CountDatum[]
    mixpanelCatalogSurfaces: CountDatum[]
    mixpanelCatalogTabs: CountDatum[]
    mixpanelFilterTypes: CountDatum[]
    mixpanelTopViewedRewards: CountDatum[]
    mixpanelTopViewedPartners: CountDatum[]
    mixpanelCoverageStartDate: string | null
    mixpanelDataThroughDate: string | null
    mixpanelMetricsRefreshedAt: string | null
    mixpanelBehaviorStatus: 'pending' | 'connected'
  }
  survey: {
    responses: number
    extraPurchases: number
    likedResponses: number
    liked: number
  }
}

export type BrandDataSnapshot = {
  country_code: 'AR' | 'UY'
  payload: BrandDataSnapshotPayload
  refreshed_at: string
}
