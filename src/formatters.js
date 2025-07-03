export function formatMarkdown({ title, summary, tech }) {
    return `**Title**: ${title}\n\n**Summary**: ${summary}\n\n**Technical considerations**: ${tech}`;
  }
  
  export function formatJSON({ title, summary, tech }) {
    return JSON.stringify(
      {
        title,
        summary,
        technical_considerations: tech
      },
      null,
      2
    );
  }