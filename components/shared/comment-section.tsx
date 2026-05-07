"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Trash2, MessageSquare, Send, AlertTriangle } from "lucide-react";
import { createComment, deleteComment } from "@/lib/actions/comment.actions";

type CommentType = {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: {
    name: string;
    jabatan: string;
    role: string;
  };
};

export function CommentSection({
  comments,
  reportId,
  claimId,
  currentUserId,
  currentUserRole,
}: {
  comments: CommentType[];
  reportId?: string;
  claimId?: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("content", content);
    if (reportId) formData.append("reportId", reportId);
    if (claimId) formData.append("claimId", claimId);

    const res = await createComment(formData);
    if (!res.success) {
      setError(res.error || "Gagal memposting komentar.");
    } else {
      setContent("");
      window.location.reload(); // Refresh unruk update list (cara sederhana)
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus komentar ini?")) return;
    const res = await deleteComment(id);
    if (!res.success) {
      alert(res.error || "Gagal menghapus komentar.");
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
        <MessageSquare size={18} className="text-orange-500" />
        <h3 className="font-bold text-slate-800 text-sm md:text-base">Diskusi</h3>
        <span className="ml-auto bg-orange-100 text-orange-700 py-0.5 px-2 rounded-full text-xs font-semibold">
          {comments.length}
        </span>
      </div>

      {/* Public Comment Disclaimer */}
      <div className="mx-4 md:mx-5 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Perhatian:</span> Komentar bersifat publik dan dapat dilihat oleh semua pengguna. Jangan menyebutkan ciri-ciri spesifik barang di komentar untuk mencegah klaim palsu.
        </p>
      </div>

      <div className="flex-1 p-4 md:p-5 overflow-y-auto min-h-[300px] flex flex-col gap-4">
        {comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 my-8">
            <MessageSquare size={32} className="opacity-20" />
            <p className="text-sm">Belum ada diskusi untuk item ini.</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isOwner = comment.authorId === currentUserId;
            const isAdmin = comment.author.role === "ADMIN";
            
            return (
              <div 
                key={comment.id}
                className={`flex gap-3 max-w-[85%] ${isOwner ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {/* Avatar */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                  {comment.author.name.substring(0, 2).toUpperCase()}
                </div>
                
                {/* Bubble */}
                <div className={`flex flex-col gap-1 ${isOwner ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 ${isOwner ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-semibold text-slate-700">
                      {comment.author.name}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                        ADMIN
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                  
                  <div className={`relative group p-3 rounded-2xl text-sm shadow-sm ${
                    isOwner 
                      ? 'bg-orange-500 text-white rounded-tr-none' 
                      : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    {comment.content}
                    
                    {/* Delete button — only for comment owner or admin */}
                    {(isOwner || currentUserRole === "ADMIN") && (
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className={`absolute top-2 ${isOwner ? '-left-8' : '-right-8'} p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 shadow-sm border border-slate-100 cursor-pointer`}
                        title="Hapus komentar"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1 min-h-[44px] max-h-[120px] resize-y rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            rows={1}
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="shrink-0 w-11 h-11 bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={18} className={isSubmitting ? "opacity-50" : "ml-0.5"} />
          </button>
        </form>
      </div>
    </div>
  );
}
