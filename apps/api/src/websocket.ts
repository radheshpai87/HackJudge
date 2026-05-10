import { Server } from "socket.io";

export function setupWebSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.on("join_event", (data: { slug: string; role: string; judgeId?: string }) => {
      const room = `event:${data.slug}:organizer`;
      const judgeRoom = data.judgeId ? `event:${data.slug}:judge:${data.judgeId}` : null;
      if (data.role === "organizer") {
        socket.join(room);
      }
      if (judgeRoom) {
        socket.join(judgeRoom);
      }
    });
  });
}
