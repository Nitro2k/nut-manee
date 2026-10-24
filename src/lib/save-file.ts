export type SaveResult = "shared" | "downloaded" | "cancelled";

/**
 * Hand a file to the user. On phones, the Share sheet ("Save to Files" → iCloud Drive);
 * elsewhere, a normal download. Call from a tap handler: sharing needs a recent user gesture.
 */
export async function saveFile(blob: Blob, filename: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: blob.type });
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // NotAllowedError (gesture expired) etc.: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
