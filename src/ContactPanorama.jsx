import { useLayoutEffect, useRef, useState } from "react";
import { panoramaTopFade } from "./panoramaFade.js";

export function ContactPanorama({ background }) {
  const bandRef = useRef(null);
  const photoRef = useRef(null);
  const [fade, setFade] = useState(0);

  useLayoutEffect(() => {
    const band = bandRef.current;
    const photo = photoRef.current;
    const measure = () => {
      const bounds = band.getBoundingClientRect();
      const image = photo.getBoundingClientRect();
      const style = getComputedStyle(photo);
      const positionY = parseFloat(style.objectPosition.split(" ")[1]) / 100;
      setFade(panoramaTopFade({
        imageWidth: image.width, imageHeight: image.height,
        imageTop: image.top - bounds.top,
        sourceWidth: photo.naturalWidth, sourceHeight: photo.naturalHeight,
        objectFit: style.objectFit, positionY: Number.isFinite(positionY) ? positionY : .5,
      }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(band);
    observer.observe(photo);
    photo.addEventListener("load", measure);
    measure();
    return () => { observer.disconnect(); photo.removeEventListener("load", measure); };
  }, [background]);

  return (
    <div className="contact-band" aria-hidden="true" ref={bandRef} style={{ "--panorama-top-fade": `${fade}px` }}>
      <img
        className="contact-band-photo"
        ref={photoRef}
        src={background}
        alt=""
        loading="lazy"
        width="2172"
        height="724"
        draggable={false}
      />
    </div>
  );
}

export default ContactPanorama;
