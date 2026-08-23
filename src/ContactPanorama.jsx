export function ContactPanorama({ background }) {
  return (
    <div className="contact-band" aria-hidden="true">
      <img
        className="contact-band-photo"
        src={background}
        alt=""
        loading="lazy"
        width="2172"
        height="724"
      />
    </div>
  );
}

export default ContactPanorama;
