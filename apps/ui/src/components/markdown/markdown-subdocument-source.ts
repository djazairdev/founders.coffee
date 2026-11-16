export const markdownSubdocumentSource = (value: string): string => {
  let activeFence: string | null = null;
  return value
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => {
      const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
      if (activeFence) {
        if (
          fence &&
          !(fence[2] ?? '').trim() &&
          fence[1][0] === activeFence[0] &&
          fence[1].length >= activeFence.length
        )
          activeFence = null;
        return line;
      }
      if (fence) {
        activeFence = fence[1];
        return line;
      }
      const heading = line.match(/^( {0,3})(#{1,6})([ \t]+)/u);
      if (!heading) return line;
      const indentation = heading[1] ?? '';
      const markers = heading[2] ?? '';
      const spacing = heading[3] ?? '';
      const shiftedMarkers = '#'.repeat(Math.min(6, markers.length + 1));
      return `${indentation}${shiftedMarkers}${spacing}${line.slice(heading[0].length)}`;
    })
    .join('\n');
};
