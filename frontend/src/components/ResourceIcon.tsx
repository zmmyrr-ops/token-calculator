import { useState } from "react";
import { appPath } from "@/base";
export default function ResourceIcon({
  name,
  icon,
}: {
  name: string;
  icon?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="platform-icon" style={icon?.includes("threejs") ? {background:"#182b3d"} : undefined}>
      {icon && !failed ? (
        <img
          src={icon.startsWith("/") ? appPath(icon) : icon}
          alt=""
          width="40"
          height="40"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{name.slice(0, 2)}</span>
      )}
    </span>
  );
}
