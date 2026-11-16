'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { t } from '@/lib/strings/en'

/** YouTube trailer in a modal. The iframe exists only while open, so closing stops playback. */
export function TrailerDialog({ videoKey, title, onClose }: { videoKey: string | null; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (videoKey && !dialog?.open) dialog?.showModal()
    if (!videoKey && dialog?.open) dialog.close()
  }, [videoKey])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-label={`${t.title.trailer}: ${title}`}
      className="m-auto w-[min(100vw-2rem,960px)] bg-transparent p-0 backdrop:bg-bg/95"
    >
      <div className="flex justify-end pb-2">
        <button type="button" onClick={() => ref.current?.close()} aria-label={t.title.close} className="p-2 text-muted hover:text-ink" autoFocus>
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>
      {videoKey && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={`${t.title.trailer}: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="aspect-video w-full rounded-sm bg-surface"
        />
      )}
    </dialog>
  )
}
