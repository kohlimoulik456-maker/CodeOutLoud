import { connection } from "next/server";
import InterviewSetup from "./InterviewSetup";

export const instant = false;

export default async function InterviewPage() {
  await connection();
  return <InterviewSetup />;
}
