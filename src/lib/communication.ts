import {
  DEFAULT_ALLOWED_ORIGINS,
  MESSAGE_TYPE,
  VIEWER_SOURCE,
} from "@/lib/constants";
import { MessageAction, ViewerMessage } from "@/types";

const normalizeOrigins = (origins?: string[]): string[] => {
  if (!origins || origins.length === 0) return ["*"];
  const sanitized = origins.map((item) => item.trim()).filter(Boolean);
  return sanitized.length ? sanitized : ["*"];
};

class CommunicationHub {
  private isEmbedded: boolean;
  private allowedOrigins: string[];

  constructor(origins?: string[]) {
    this.isEmbedded =
      typeof window !== "undefined" && window.self !== window.top;
    this.allowedOrigins = normalizeOrigins(origins || DEFAULT_ALLOWED_ORIGINS);
  }

  // 仅在嵌入模式下向父页面发送消息
  public postMessage<T = unknown>(action: MessageAction, data?: T) {
    if (!this.isEmbedded || typeof window === "undefined") return;

    const payload: ViewerMessage<T> = {
      type: MESSAGE_TYPE,
      action,
      data,
      source: VIEWER_SOURCE,
    };

    const targetOrigin = this.allowedOrigins.includes("*")
      ? "*"
      : this.allowedOrigins[0] || "*";

    window.parent.postMessage(payload, targetOrigin);
  }

  // 监听父页面消息，返回卸载函数
  public listen(callback: (action: MessageAction, data: unknown) => void) {
    if (!this.isEmbedded || typeof window === "undefined") return;

    const handler = (event: MessageEvent<ViewerMessage<unknown>>) => {
      if (!this.isOriginAllowed(event.origin)) return;
      if (event.data?.type !== MESSAGE_TYPE) return;
      if (event.data?.source !== VIEWER_SOURCE) return;

      callback(event.data.action, event.data.data);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }

  private isOriginAllowed(origin: string) {
    if (this.allowedOrigins.includes("*")) return true;
    if (!origin || origin === "null") return false;
    return this.allowedOrigins.some((allowed) => allowed === origin);
  }
}

export default CommunicationHub;
