export function classifyScore(score) {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  return "Low";
}

export function applyScoringGroups(jobs = []) {
  return jobs.map((job) => {
    const score = Number(job.score || 0);
    return {
      ...job,
      score,
      group: job.group || classifyScore(score)
    };
  });
}
