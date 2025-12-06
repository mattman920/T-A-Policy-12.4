// @ts-ignore
import { getStore } from "https://esm.sh/@netlify/blobs@10.4.2?target=deno";

// eslint-disable-next-line no-console
console.log("fireproof edge function loaded netlify");

interface CRDTEntry {
    readonly data: string;
    readonly cid: string;
    readonly parents: string[];
}

export default async (req: Request) => {
    // eslint-disable-next-line no-restricted-globals
    const url = new URL(req.url);
    const carId = url.searchParams.get("car");
    const metaDb = url.searchParams.get("meta");

    console.log(`[Fireproof Debug] Request: ${req.method} ${url.pathname} car=${carId} meta=${metaDb}`);

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    try {
        // Test store access
        try {
            const testStore = getStore("test");
            await testStore.set("ping", "pong");
            console.log("[Fireproof Debug] Store access successful");
        } catch (err) {
            console.error("[Fireproof Debug] Store access failed:", err);
        }

        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers,
            });
        }

        if (req.method === "PUT") {
            if (carId) {
                console.log(`[Fireproof] PUT car ${carId}`);
                const carFiles = getStore("cars");
                const carArrayBuffer = await req.arrayBuffer();
                await carFiles.set(carId, carArrayBuffer);
                return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
            } else if (metaDb) {
                console.log(`[Fireproof] PUT meta ${metaDb}`);
                const meta = getStore("meta");
                const x = await req.json();
                // fixme, marty changed to [0] as it is a slice of the structure we expected
                if (Array.isArray(x) && x.length > 0) {
                    const { data, cid, parents } = x[0] as CRDTEntry;
                    await meta.setJSON(`${metaDb}/${cid}`, { data, parents });
                    return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
                } else {
                    return new Response("Invalid body", { status: 400, headers });
                }
            }
        } else if (req.method === "GET") {
            if (carId) {
                console.log(`[Fireproof] GET car ${carId}`);
                const carFiles = getStore("cars");
                const carArrayBuffer = await carFiles.get(carId, { type: "arrayBuffer" });
                if (!carArrayBuffer) {
                    console.log(`[Fireproof] Car ${carId} not found`);
                    return new Response("Not found", { status: 404, headers });
                }
                return new Response(carArrayBuffer, { status: 200, headers });
            } else if (metaDb) {
                console.log(`[Fireproof] GET meta ${metaDb}`);
                const meta = getStore("meta");

                let blobs: any[] = [];
                let cursor: string | undefined;
                do {
                    // @ts-ignore
                    const result: any = await meta.list({ prefix: `${metaDb}/`, cursor });
                    blobs = blobs.concat(result.blobs);
                    cursor = result.cursor;
                } while (cursor);

                console.log(`[Fireproof] Found ${blobs.length} blobs for ${metaDb}`);
                const allParents = [] as string[];
                const entries = (
                    await Promise.all(
                        blobs.map(async (blob) => {
                            const blobContents = await meta.get(blob.key, {
                                type: "json",
                            });
                            if (!blobContents) {
                                return { cid: blob.key.split("/")[1], data: null };
                            }
                            const { data, parents } = blobContents;
                            if (parents) {
                                for (const p of parents) {
                                    allParents.push(p.toString());
                                    void meta.delete(`${metaDb}/${p}`);
                                }
                            }
                            return { cid: blob.key.split("/")[1], data, parents };
                        })
                    )
                ).filter((entry) => entry.data !== null && !allParents.includes(entry.cid));
                return new Response(JSON.stringify(entries), { status: 200, headers });
            }
        } else if (req.method === "DELETE") {
            console.log(`[Fireproof] DELETE ${req.method}`);
            if (carId) {
                const carFiles = getStore("cars");
                await carFiles.delete(carId);
                return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
            } else if (metaDb) {
                const meta = getStore("meta");
                let cursor;
                let deletedCount = 0;
                do {
                    // @ts-ignore
                    const result: any = await meta.list({ prefix: `${metaDb}/`, cursor });
                    await Promise.all(result.blobs.map((blob: any) => meta.delete(blob.key)));
                    deletedCount += result.blobs.length;
                    cursor = result.cursor;
                } while (cursor);

                console.log(`[Fireproof] Deleted ${deletedCount} blobs for ${metaDb}`);
                return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
            } else {
                const meta = getStore("meta");
                let cursor: string | undefined;
                do {
                    // @ts-ignore
                    const result: any = await meta.list({ prefix: `main/`, cursor });
                    for (const blob of result.blobs) {
                        await meta.delete((blob as any).key);
                    }
                    cursor = result.cursor;
                } while (cursor);
                return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
            }
        }
    } catch (e) {
        console.error(`[Fireproof] Error:`, e);
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers
    });
};

export const config = { path: "/fireproof" };
