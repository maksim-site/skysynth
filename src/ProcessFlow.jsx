import {
  CircuitBoard,
  ClipboardList,
  Files,
  FlaskConical,
  Network,
} from "lucide-react";

const stageIcons = [ClipboardList, Network, CircuitBoard, FlaskConical, Files];

/**
 * A readable engineering sequence. Each visual names the kind of work done at
 * that stage instead of showing an unrelated finished PCB.
 */
export function ProcessFlow({ steps }) {
  return (
    <ol className="process-sequence">
      {steps.map((step, index) => {
        const StageIcon = stageIcons[index];

        return (
          <li className="process-sequence-step" key={step.number}>
            <p className="process-sequence-number">{step.number}</p>

            <div className="process-sequence-visual" aria-hidden="true">
              <StageIcon strokeWidth={1.25} />
              <span>{step.visualLabel}</span>
            </div>

            <div className="process-sequence-copy">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
