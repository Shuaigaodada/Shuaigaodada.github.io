// Reading units: one Han character or one Latin word/number; links and demo code are not prose.
export function readingStats(markdown = '') {
  const prose = markdown.replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '');
  const units = (prose.match(/\p{Script=Han}|[\p{Script=Latin}\p{N}]+/gu) || []).length;
  return { units, minutes: Math.ceil(units / 200) };
}
