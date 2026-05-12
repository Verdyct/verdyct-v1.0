import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestCn8 } from "@verdyct/worker-ingest-cn8";
import { ingestTaricFull } from "@verdyct/worker-ingest-taric-full";
import { cascadeProcessLine } from "@verdyct/worker-cascade-process-line";
import { ingestEbtiFull } from "@verdyct/worker-ingest-ebti-full";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestCn8, ingestTaricFull, cascadeProcessLine, ingestEbtiFull],
});
