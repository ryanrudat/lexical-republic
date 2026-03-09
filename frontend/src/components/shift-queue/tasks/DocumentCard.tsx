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
    <div className="bg-white border border-[#D4CFC6] rounded-xl border-l-2 border-l-sky-400">
      {/* Document header */}
      <div className="px-4 py-3 border-b border-[#EDE8DE] space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-special-elite text-sm text-[#2C3340] tracking-wider">
            {title}
          </span>
          {classification && (
            <span className="px-2 py-0.5 bg-[#FAFAF7] border border-[#E8E4DC] rounded-full font-ibm-mono text-[8px] text-[#9CA3AF] tracking-widest">
              {classification}
            </span>
          )}
        </div>
        {department && (
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-wider">
            {department}
          </p>
        )}
        {priority && (
          <p className="font-ibm-mono text-[10px] text-amber-600 tracking-wider uppercase">
            Priority: {priority}
          </p>
        )}
        {(from || to || re) && (
          <div className="space-y-0.5 pt-1">
            {from && (
              <p className="font-ibm-mono text-[10px] text-[#6B7280]">
                <span className="text-[#B8B3AA] mr-2">FROM:</span>
                {from}
              </p>
            )}
            {to && (
              <p className="font-ibm-mono text-[10px] text-[#6B7280]">
                <span className="text-[#B8B3AA] mr-2">TO:</span>
                {to}
              </p>
            )}
            {re && (
              <p className="font-ibm-mono text-[10px] text-[#6B7280]">
                <span className="text-[#B8B3AA] mr-2">RE:</span>
                {re}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Document body */}
      <div className="px-4 py-3">
        {typeof body === 'string' ? (
          <p className="text-sm text-[#4B5563] leading-relaxed">{body}</p>
        ) : (
          body
        )}
      </div>

      {/* Reviewed by stamp */}
      {reviewedBy && (
        <div className="px-4 py-2 border-t border-[#EDE8DE]">
          <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider">
            Reviewed by: {reviewedBy}
          </p>
        </div>
      )}

      {/* Action area */}
      {children && (
        <div className="px-4 py-3 border-t border-[#EDE8DE]">{children}</div>
      )}
    </div>
  );
}
