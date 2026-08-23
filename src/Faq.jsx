import { useState } from "react";
import { Plus } from "lucide-react";

/** Аккордеон: одновременно раскрыт один вопрос, ответы всегда в разметке. */
export function Faq({ items }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq">
      {items.map((item, index) => {
        const isOpen = index === open;
        return (
          <div className="faq-item" data-open={isOpen} data-reveal="out" key={item.q}>
            <h3>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span>{item.q}</span>
                <Plus className="faq-sign" aria-hidden="true" size={18} strokeWidth={1.6} />
              </button>
            </h3>
            <div
              className="faq-answer"
              id={`faq-answer-${index}`}
              role="region"
              aria-labelledby={`faq-question-${index}`}
              aria-hidden={!isOpen}
            >
              <div className="faq-answer-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
