import data from "@/data/cosmetics.json";

export async function GET() {
    return Response.json(data);
}
