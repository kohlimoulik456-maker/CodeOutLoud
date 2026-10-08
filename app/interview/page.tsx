import { connection } from "next/server";
import InterviewArena from "./InterviewArena";

export const instant = false;

export default async function InterviewPage() {
  await connection();
  return <InterviewArena />;
}
