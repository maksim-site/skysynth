import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useMediaQuery } from "./media.js";

export default function ServiceOffering({ offering }) {
  const compact = useMediaQuery("(max-width: 739px)");
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => { setExpanded(!compact); }, [compact]);

  return (
    <article className="service-offering" id={offering.id} aria-labelledby={`${offering.id}-title`} data-reveal="out">
      <span className="service-offering-icon" aria-hidden="true">
        <offering.icon size={26} strokeWidth={1.4} />
      </span>
      <h3 className="service-offering-title" id={`${offering.id}-title`}>{offering.title}</h3>
      <p className="service-offering-description">{offering.description}</p>
      <details className="service-detail-disclosure" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>
          <span>{offering.id === "reverse" ? "Как проходит работа" : "Что входит в услугу"}</span>
          <Plus aria-hidden="true" size={20} strokeWidth={1.5} />
        </summary>
        <ul className="service-offering-details">
          {offering.details.map((detail) => (
            <li key={detail.title}>
              <h4>{detail.title}</h4>
              <p>{detail.text}</p>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
