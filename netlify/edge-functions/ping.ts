export default async (req: Request) => {
    return new Response("Pong", {
        headers: { "Content-Type": "text/plain" },
    });
};

export const config = { path: "/ping" };
