interface DocumentCardProps {
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  body: React.ReactNode;
  reviewedBy?: string;
  children?: React.ReactNode;
}

export default function DocumentCard({
  title,
  department,
  classification,
  priority,
  from,
  to,
  re,
  body,
  reviewedBy,
  children,
}: DocumentCardProps) {
  return (
    <div className="ios-glass-card border border-white/10 border-l-2 border-l-neon-cyan/30">
      {/* Document header */}
      <div className="px-4 py-3 border-b border-white/5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-special-elite text-sm text-white/90 tracking-wider">
            {title}
          </span>
          {classification && (
            <span className="ios-glass-pill px-2 py-0.5 font-ibm-mono text-[8px] text-white/40 tracking-widest">
              {classification}
            </span>
          )}
        </div>
        {department && (
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
            {department}
          </p>
        )}
        {priority && (
          <p className="font-ibm-mono text-[10px] text-terminal-amber/60 tracking-wider uppercase">
            Priority: {priority}
          </p>
        )}
        {(from || to || re) && (
          <div className="space-y-0.5 pt-1">
            {from && (
              <p className="font-ibm-mono text-[10px] text-white/40">
                <span className="text-white/20 mr-2">FROM:</span>
                {from}
              </p>
            )}
            {to && (
              <p className="font-ibm-mono text-[10px] text-white/40">
                <span className="text-white/20 mr-2">TO:</span>
                {to}
              </p>
            )}
            {re && (
              <p className="font-ibm-mono text-[10px] text-white/40">
                <span className="text-white/20 mr-2">RE:</span>
                {re}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Document body */}
      <div className="px-4 py-3">
        {typeof body === 'string' ? (
          <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">{body}</p>
        ) : (
          body
        )}
      </div>

      {/* Reviewed by stamp */}
      {reviewedBy && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="font-ibm-mono text-[9px] text-white/20 tracking-wider">
            Reviewed by: {reviewedBy}
          </p>
        </div>
      )}

      {/* Action area */}
      {children && (
        <div className="px-4 py-3 border-t border-white/5">{children}</div>
      )}
    </div>
  );
}
