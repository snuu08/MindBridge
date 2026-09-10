import { useState } from 'react'
import { displayNameFromUser, useAuthSession } from '../../hooks/useAuthSession.ts'
import { supabase } from '../../lib/supabase.ts'
import { useMindMapStore } from '../../store/useMindMapStore.ts'
import type { MindMapDocument } from '../../types/mindmap.ts'
import styles from './StartScreen.module.css'

interface HomePageProps {
  onStartNew: () => void
  onOpenDocument: (id: string) => void
}

type Dialog =
  | { type: 'rename'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'password'; id: string }
  | { type: 'unlock'; id: string }

function thoughtPreview(document: MindMapDocument) {
  const labels = document.nodes
    .filter((node) => node.data.origin === 'human')
    .map((node) => node.data.label.trim())
    .filter(Boolean)
  const extra = labels[0] === document.title ? labels.slice(1) : labels
  return extra.slice(0, 4).join(' · ')
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HomePage({ onStartNew, onOpenDocument }: HomePageProps) {
  const library = useMindMapStore((state) => state.library)
  const renameDocument = useMindMapStore((state) => state.renameDocument)
  const deleteDocument = useMindMapStore((state) => state.deleteDocument)
  const setDocumentPassword = useMindMapStore((state) => state.setDocumentPassword)
  const clearDocumentPassword = useMindMapStore((state) => state.clearDocumentPassword)
  const verifyDocumentPassword = useMindMapStore((state) => state.verifyDocumentPassword)
  const { user } = useAuthSession()
  const accountLabel = displayNameFromUser(user)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const selected = dialog ? library.find((item) => item.id === dialog.id) : null

  function closeDialog() {
    setDialog(null)
    setTitleDraft('')
    setPassword('')
    setPasswordConfirm('')
    setCurrentPassword('')
    setError('')
    setPending(false)
  }

  function openThought(document: MindMapDocument) {
    if (document.passwordHash) {
      setDialog({ type: 'unlock', id: document.id })
      setError('')
      setPassword('')
      return
    }
    onOpenDocument(document.id)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.accountBar}>
        {accountLabel ? <span>{accountLabel}</span> : null}
        <button
          type="button"
          className={styles.signOut}
          onClick={() => {
            void supabase.auth.signOut()
          }}
        >
          로그아웃
        </button>
      </div>
      <div className={styles.card}>
        <h1 className={styles.logo}>MindBridge</h1>
        <p className={styles.lead}>
          {accountLabel ? `${accountLabel}님, 로그인되었습니다.` : '로그인되었습니다.'}
        </p>
        <h2 className={styles.section}>여태까지 했던 생각</h2>
        {library.length === 0 ? (
          <p className={styles.saved}>아직 저장된 생각이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {library.map((document) => {
              const preview = thoughtPreview(document)
              const when = formatWhen(document.updatedAt)
              return (
                <li key={document.id} className={styles.itemCard}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => openThought(document)}
                  >
                    <span className={styles.itemTitle}>
                      {document.title}
                      {document.passwordHash ? (
                        <span className={styles.lock}>잠김</span>
                      ) : null}
                    </span>
                    {preview ? <span className={styles.itemMeta}>{preview}</span> : null}
                    {when ? <span className={styles.itemWhen}>{when}</span> : null}
                  </button>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.action}
                      onClick={() => {
                        setDialog({ type: 'rename', id: document.id })
                        setTitleDraft(document.title)
                        setError('')
                      }}
                    >
                      제목 수정
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      onClick={() => {
                        setDialog({ type: 'password', id: document.id })
                        setPassword('')
                        setPasswordConfirm('')
                        setCurrentPassword('')
                        setError('')
                      }}
                    >
                      비밀번호
                    </button>
                    <button
                      type="button"
                      className={styles.actionDanger}
                      onClick={() => {
                        setDialog({ type: 'delete', id: document.id })
                        setError('')
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <button type="button" className={`btn btn-primary ${styles.enter}`} onClick={onStartNew}>
          새 생각 시작하기
        </button>
      </div>

      {dialog && selected ? (
        <div className={styles.overlay} role="presentation" onClick={closeDialog}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            {dialog.type === 'rename' ? (
              <>
                <h3 id="library-dialog-title" className={styles.dialogTitle}>
                  제목 수정
                </h3>
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!renameDocument(dialog.id, titleDraft)) {
                      setError('제목을 입력하세요.')
                      return
                    }
                    closeDialog()
                  }}
                >
                  <label className="sr-only" htmlFor="rename-title">
                    제목
                  </label>
                  <input
                    id="rename-title"
                    className={styles.input}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    autoFocus
                  />
                  {error ? <p className={styles.dialogError}>{error}</p> : null}
                  <div className={styles.dialogActions}>
                    <button type="button" className="btn" onClick={closeDialog}>
                      취소
                    </button>
                    <button type="submit" className="btn btn-primary">
                      저장
                    </button>
                  </div>
                </form>
              </>
            ) : null}

            {dialog.type === 'delete' ? (
              <>
                <h3 id="library-dialog-title" className={styles.dialogTitle}>
                  생각 삭제
                </h3>
                <p className={styles.dialogLead}>
                  “{selected.title}”을(를) 삭제할까요? 되돌릴 수 없습니다.
                </p>
                <div className={styles.dialogActions}>
                  <button type="button" className="btn" onClick={closeDialog}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      deleteDocument(dialog.id)
                      closeDialog()
                    }}
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : null}

            {dialog.type === 'password' ? (
              <>
                <h3 id="library-dialog-title" className={styles.dialogTitle}>
                  {selected.passwordHash ? '비밀번호 변경' : '비밀번호 설정'}
                </h3>
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (password !== passwordConfirm) {
                      setError('비밀번호가 서로 다릅니다.')
                      return
                    }
                    setPending(true)
                    void setDocumentPassword(
                      dialog.id,
                      password,
                      selected.passwordHash ? currentPassword : undefined,
                    ).then((message) => {
                      setPending(false)
                      if (message) {
                        setError(message)
                        return
                      }
                      closeDialog()
                    })
                  }}
                >
                  {selected.passwordHash ? (
                    <>
                      <label className={styles.fieldLabel} htmlFor="current-password">
                        현재 비밀번호
                      </label>
                      <input
                        id="current-password"
                        className={styles.input}
                        type="password"
                        value={currentPassword}
                        disabled={pending}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </>
                  ) : null}
                  <label className={styles.fieldLabel} htmlFor="thought-password">
                    새 비밀번호
                  </label>
                  <input
                    id="thought-password"
                    className={styles.input}
                    type="password"
                    value={password}
                    disabled={pending}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="4자 이상"
                  />
                  <label className={styles.fieldLabel} htmlFor="thought-password-confirm">
                    새 비밀번호 확인
                  </label>
                  <input
                    id="thought-password-confirm"
                    className={styles.input}
                    type="password"
                    value={passwordConfirm}
                    disabled={pending}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                  />
                  {error ? <p className={styles.dialogError}>{error}</p> : null}
                  <div className={styles.dialogActions}>
                    <button type="button" className="btn" onClick={closeDialog} disabled={pending}>
                      취소
                    </button>
                    {selected.passwordHash ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={pending}
                        onClick={() => {
                          setPending(true)
                          void clearDocumentPassword(dialog.id, currentPassword).then((message) => {
                            setPending(false)
                            if (message) {
                              setError(message)
                              return
                            }
                            closeDialog()
                          })
                        }}
                      >
                        해제
                      </button>
                    ) : null}
                    <button type="submit" className="btn btn-primary" disabled={pending}>
                      저장
                    </button>
                  </div>
                </form>
              </>
            ) : null}

            {dialog.type === 'unlock' ? (
              <>
                <h3 id="library-dialog-title" className={styles.dialogTitle}>
                  비밀번호 입력
                </h3>
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault()
                    setPending(true)
                    void verifyDocumentPassword(dialog.id, password).then((ok) => {
                      setPending(false)
                      if (!ok) {
                        setError('비밀번호가 올바르지 않습니다.')
                        return
                      }
                      closeDialog()
                      onOpenDocument(dialog.id)
                    })
                  }}
                >
                  <label className="sr-only" htmlFor="unlock-password">
                    비밀번호
                  </label>
                  <input
                    id="unlock-password"
                    className={styles.input}
                    type="password"
                    value={password}
                    disabled={pending}
                    onChange={(event) => setPassword(event.target.value)}
                    autoFocus
                  />
                  {error ? <p className={styles.dialogError}>{error}</p> : null}
                  <div className={styles.dialogActions}>
                    <button type="button" className="btn" onClick={closeDialog} disabled={pending}>
                      취소
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={pending}>
                      열기
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
