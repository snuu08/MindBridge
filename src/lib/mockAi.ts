import type { ElaborationResponse } from '../schemas/elaborationSchema.ts'
import type { AnalysisResponse, Insight } from '../schemas/insightSchema.ts'
import type { AnalysisPayload } from '../types/mindmap.ts'
import { isDuplicateTitle } from './duplicateDetection.ts'

function remapInsights(insights: Insight[], payload: AnalysisPayload): Insight[] {
  const fallbackIds = payload.nodes
    .filter((node) => node.origin === 'human' && node.parentId)
    .map((node) => node.id)
  const allIds = payload.nodes.map((node) => node.id)
  const known = new Set(allIds)

  return insights.map((insight) => {
    const mapped = insight.basedOnNodeIds.filter((id) => known.has(id))
    const basedOnNodeIds =
      mapped.length > 0
        ? mapped
        : fallbackIds.length > 0
          ? fallbackIds.slice(-2)
          : allIds.slice(0, 1)
    return { ...insight, basedOnNodeIds }
  })
}

function joinedHumanText(payload: AnalysisPayload): string {
  const labels = payload.nodes
    .filter((node) => node.origin === 'human')
    .map((node) => node.label)
  const paths = payload.humanPaths?.flat() ?? []
  return [...labels, ...paths, payload.topic].join(' ')
}

export function isDemoPolicyMap(payload: AnalysisPayload): boolean {
  const text = joinedHumanText(payload)
  return text.includes('소상공인') || text.includes('성남시')
}

function focusHumanIds(payload: AnalysisPayload): string[] {
  const focusId =
    payload.scope.type === 'branch' ? payload.scope.focusNodeId : undefined
  const human = payload.nodes.filter((node) => node.origin === 'human')
  const ids: string[] = []
  if (focusId && human.some((node) => node.id === focusId)) ids.push(focusId)
  for (const node of human) {
    if (node.parentId && !ids.includes(node.id)) ids.push(node.id)
  }
  if (ids.length === 0 && human[0]) ids.push(human[0].id)
  return ids.slice(-3)
}

function latestHumanPath(payload: AnalysisPayload): string[] {
  const focusId =
    payload.scope.type === 'branch' ? payload.scope.focusNodeId : undefined
  if (focusId) {
    const match = payload.humanPaths?.find((path) => {
      const leafLabel = payload.nodes.find((node) => node.id === focusId)?.label
      return leafLabel ? path.includes(leafLabel) : false
    })
    if (match) return match
  }
  return (
    payload.humanPaths?.[0] ??
    payload.nodes.filter((node) => node.origin === 'human').map((node) => node.label)
  )
}

const PRIMARY_INSIGHTS: Insight[] = [
  {
    id: 'mock-1',
    type: 'agenda',
    title: '소상공인 지원정책 모니터링',
    content:
      '지원정책이 실제 소상공인에게 전달되고 활용되는 과정을 점검하는 안건입니다.',
    rationale: '현재 생각에는 정책의 실제 이용률과 신청 과정에 대한 검토가 없습니다.',
    basedOnNodeIds: ['node-policy', 'node-small-business'],
    gap: '정책 이용 과정과 체감 효과',
    questions: [
      '정책을 실제로 알고 있는가?',
      '신청 과정에서 어디서 포기하는가?',
      '지원 이후 어떤 변화가 있었는가?',
    ],
    actions: ['담당부서 인터뷰', '이용자 설문', '운영자료 요청'],
  },
  {
    id: 'mock-2',
    type: 'perspective',
    title: '정책 이용자의 실제 체감도',
    content:
      '행정에서 제공하는 지원 내용과 소상공인이 실제로 느끼는 도움 사이의 차이를 확인합니다.',
    rationale:
      '현재 생각은 정책 제공자의 관점에 가깝고 이용자의 경험은 포함되지 않았습니다.',
    basedOnNodeIds: ['node-policy', 'node-small-business'],
    gap: '정책 이용자 관점',
    questions: [
      '실제 도움이 된 지원은 무엇인가?',
      '지원 이후에도 남은 문제는 무엇인가?',
    ],
    actions: ['이용 경험 인터뷰', '만족도와 개선 요구 분리'],
  },
  {
    id: 'mock-3',
    type: 'question',
    title: '지원사업 홍보 사각지대',
    content: '지원정책을 알지 못해 신청하지 못한 소상공인이 있는지 확인합니다.',
    rationale: '정책 존재 여부뿐 아니라 정책이 대상에게 전달되는 과정도 중요합니다.',
    basedOnNodeIds: ['node-small-business'],
    gap: '정책 인지도와 정보 접근성',
    questions: [
      '주로 어떤 경로로 정책을 알게 되는가?',
      '온라인 홍보가 실제 대상에게 도달하는가?',
    ],
    actions: ['인지경로 설문', '홍보채널별 도달 대상 비교'],
  },
]

const RETHINK_INSIGHTS: Insight[] = [
  {
    id: 'mock-r1',
    type: 'action',
    title: '신청 포기 지점 현장 기록',
    content:
      '신청 화면과 창구에서 이용자가 중단하는 단계를 시간순으로 기록하는 실행 항목입니다.',
    rationale: '이용 과정 점검은 나왔지만 어디서 포기하는지 관찰하는 방법은 없습니다.',
    basedOnNodeIds: ['node-small-business'],
    gap: '신청 이탈을 확인하는 실행 방법',
    questions: ['어느 단계에서 가장 많이 멈추는가?', '안내 문구가 이해를 돕는가?'],
    actions: ['신청 단계별 이탈 기록', '창구 대기 관찰'],
  },
  {
    id: 'mock-r2',
    type: 'perspective',
    title: '지원 대상에서 빠진 집단',
    content:
      '요건에는 해당하지만 신청하지 않거나 제외되는 집단이 있는지 반대 관점에서 점검합니다.',
    rationale: '현재 가지는 지원 대상만 있고, 제외되거나 도달하지 못한 집단은 없습니다.',
    basedOnNodeIds: ['node-policy', 'node-small-business'],
    gap: '제외 집단과 사각지대',
    questions: ['요건 밖 사업자는 누구인가?', '중복 지원으로 탈락하는가?'],
    actions: ['자격 요건과 실제 신청자 비교'],
  },
  {
    id: 'mock-r3',
    type: 'question',
    title: '기존 사업과의 중복',
    content:
      '비슷한 시 사업이나 중앙부처 지원과 겹치는지 확인해야 회의에서 범위를 정할 수 있습니다.',
    rationale: '새로운 안건을 만들기 전에 이미 있는 사업과 겹치는지 확인하는 질문이 없습니다.',
    basedOnNodeIds: ['node-policy'],
    gap: '기존 사업과의 중복 검토',
    questions: ['이미 비슷한 조사가 있었는가?', '담당 부서가 나뉘어 있는가?'],
    actions: ['유사 사업 목록 정리'],
  },
]

export const MOCK_ANALYSIS: AnalysisResponse = {
  analysisSummary:
    '정책과 지원 대상은 정해졌지만 실제 이용 과정과 효과를 확인하는 관점이 빠져 있습니다.',
  insights: PRIMARY_INSIGHTS,
  clarification: null,
}

export const MOCK_CLARIFICATION: AnalysisResponse = {
  analysisSummary: '작성된 생각만으로는 회의의 목적을 특정하기 어렵습니다.',
  insights: [],
  clarification: {
    question:
      '이번 회의에서 아이디어를 정하려는 건가요, 아니면 진행 중인 활동의 문제를 점검하려는 건가요?',
    options: [
      '아이디어를 정하려는 회의',
      '진행 중인 활동의 문제를 점검',
      '둘 다 해당한다',
    ],
  },
}

export const MOCK_ELABORATION: ElaborationResponse = {
  purpose:
    '실제 이용자가 정책을 알고 신청하고 체감하는 과정에서 어떤 문제가 발생하는지 확인한다.',
  checks: [
    '지원 대상과 실제 신청자의 차이',
    '신청 과정의 이탈 지점',
    '사업 이용 이후의 체감 효과',
  ],
  methods: ['담당부서 인터뷰', '이용자 및 미이용자 간단 설문'],
  materials: [
    '모집 및 신청 현황',
    '탈락 또는 중도 포기 현황',
    '만족도 조사 결과',
  ],
  decisions: ['모니터링 범위', '질문 대상', '담당자', '조사 일정'],
}

function contextualInsights(
  payload: AnalysisPayload,
  rethink: boolean,
): Insight[] {
  const path = latestHumanPath(payload)
  const basedOnNodeIds = focusHumanIds(payload)
  const leaf = path[path.length - 1] ?? payload.topic
  const prev = path[path.length - 2] ?? payload.topic
  const trail = path.join(' → ')

  if (!rethink) {
    return [
      {
        id: 'ctx-1',
        type: 'agenda',
        title: `${leaf}을 회의에서 결정할 안건으로 정리`,
        content: `${prev}에서 ${leaf}까지는 적혀 있지만, 회의에서 무엇을 결정하고 어디에 보여줄지는 아직 없습니다. 보여주기인지 실제 도입인지부터 나누는 안건입니다.`,
        rationale: `사용자는 ‘${trail}’까지 생각했지만, 그 다음 선택지와 판단 기준은 작성하지 않았습니다.`,
        basedOnNodeIds,
        gap: '목적과 결정 사항이 없는 상태',
        questions: [
          `${leaf}은 실제 필요인가, 있어 보이기 위한 선택인가?`,
          '이 회의에서 누구를 설득해야 하는가?',
          `${prev}를 다른 방식으로 보여줄 대안은 무엇인가?`,
        ],
        actions: ['시연 목적 한 문장으로 적기', '대상에게 보여줄 장면만 고르기'],
      },
      {
        id: 'ctx-2',
        type: 'perspective',
        title: '있어 보이기 뒤에 숨은 리스크',
        content: `${leaf}라는 동기는 상대에게는 준비 부족, 실패, 보안 문제로 보일 수 있습니다. 터미널 시연이 끊기면 회의가 어떻게 끝나는지부터 봐야 합니다.`,
        rationale: `현재 생각은 ‘${prev}’와 ‘${leaf}’에 머물고, 실패하거나 어색해 보일 때의 관점은 없습니다.`,
        basedOnNodeIds,
        gap: '보여주기 실패와 반대 관점',
        questions: [
          '터미널이 멈추면 무엇으로 이어갈 것인가?',
          '있어 보이려다 오히려 신뢰가 깨지는 지점은 어디인가?',
        ],
        actions: ['실패 시 대체 화면 준비', '시연 시간을 2분으로 제한'],
      },
      {
        id: 'ctx-3',
        type: 'question',
        title: `${prev} 대신 쓸 수 있는 보여주기 방식`,
        content: `터미널로 직접 돌리는 것 외에, 녹화 클립, 짧은 명령 한 줄, 이미 끝난 결과 화면처럼 더 안전한 보여주기 방식이 있는지 확인해야 합니다.`,
        rationale: `사용자는 ${prev}를 거의 유일한 방법처럼 적었고, 같은 목적인 ${leaf}를 달성하는 다른 경로는 없습니다.`,
        basedOnNodeIds,
        gap: '같은 목적을 위한 대안 경로',
        questions: [
          '라이브 실행이 꼭 필요한가?',
          '미리 만든 결과물로도 같은 인상을 줄 수 있는가?',
        ],
        actions: ['라이브와 녹화 중 하나를 고르기', '최소 시연 시나리오 작성'],
      },
    ]
  }

  return [
    {
      id: 'ctx-r1',
      type: 'action',
      title: '2분 리허설로 보여주기 점검',
      content: `${leaf}가 목표면, 회의 전에 같은 명령을 두 번 실행해 실패 지점을 미리 확인하는 실행 항목이 필요합니다.`,
      rationale: '목적과 리스크는 떠올렸지만 실제로 어떻게 점검할지는 아직 없습니다.',
      basedOnNodeIds,
      gap: '시연 준비의 실행 방법',
      questions: ['어느 명령이 가장 잘 멈추는가?', '누가 옆에서 볼 것인가?'],
      actions: ['리허설 체크리스트 만들기'],
    },
    {
      id: 'ctx-r2',
      type: 'perspective',
      title: '보는 사람이 궁금해할 질문',
      content: `있어 보이려는 쪽의 시선이 아니라, 회의 참석자가 ${prev}를 보고 물을 반론을 먼저 적어야 합니다.`,
      rationale: '현재는 시연하는 사람의 동기만 있고 보는 사람의 질문은 없습니다.',
      basedOnNodeIds,
      gap: '청중 관점',
      questions: ['이걸로 무엇을 할 수 있느냐는 질문에 뭐라고 답할 것인가?'],
      actions: ['예상 질문 세 가지 적기'],
    },
    {
      id: 'ctx-r3',
      type: 'agenda',
      title: '보여주기와 실제 도입을 분리하는 안건',
      content: '시연용 연출과 이후에 실제로 쓸 방식을 한 안건에서 나눠 결정해야 다음에 무엇을 준비할지 정할 수 있습니다.',
      rationale: '같은 생각이 인상과 실행을 한꺼번에 다루고 있어 선택이 섞여 있습니다.',
      basedOnNodeIds,
      gap: '인상과 실행의 분리',
      questions: ['오늘은 인상만 남기면 되는가, 도입 여부까지 정하는가?'],
      actions: ['안건을 시연/도입 두 칸으로 나누기'],
    },
  ]
}

export function getMockAnalysis(payload: AnalysisPayload): AnalysisResponse {
  const humanCount = payload.nodes.filter(
    (node) => node.origin === 'human' && node.parentId,
  ).length

  if (humanCount < 2 && !payload.clarificationAnswer) {
    return MOCK_CLARIFICATION
  }

  const rethink = payload.requestType === 'rethink'
  const source = isDemoPolicyMap(payload)
    ? rethink
      ? RETHINK_INSIGHTS
      : PRIMARY_INSIGHTS
    : contextualInsights(payload, rethink)
  const blocked = payload.existingInsights
  const filtered = source.filter((insight) => !isDuplicateTitle(insight.title, blocked))
  const insights = remapInsights(filtered.slice(0, 3), payload)

  return {
    analysisSummary: isDemoPolicyMap(payload)
      ? rethink
        ? '앞선 제안과 겹치지 않는 실행 방법과 반대 관점을 추가로 살펴봤습니다.'
        : MOCK_ANALYSIS.analysisSummary
      : `${latestHumanPath(payload).join(' → ')}까지는 직접 작성됐습니다. 이 줄 다음에 아직 없는 판단과 대안을 제안합니다.`,
    insights,
    clarification: insights.length === 0 ? MOCK_CLARIFICATION.clarification : null,
  }
}

export function getMockElaboration(body?: {
  title: string
  content: string
}): ElaborationResponse {
  const text = `${body?.title ?? ''} ${body?.content ?? ''}`
  if (text && !/소상공인|성남/.test(text)) {
    return {
      purpose: `${body?.title ?? '이 안건'}이 회의에서 왜 필요한지, 누구를 설득하려는지를 분명히 한다.`,
      checks: [
        '이 선택이 실제 필요인가 보여주기인가',
        '실패했을 때 회의가 어떻게 보이는가',
        '더 단순한 대안이 있는가',
      ],
      methods: ['짧은 사전 리허설', '실패 시 대체 시연 준비'],
      materials: ['시연 시나리오', '필요한 환경 목록'],
      decisions: ['시연 방식', '담당자', '허용 시간'],
    }
  }
  return MOCK_ELABORATION
}

