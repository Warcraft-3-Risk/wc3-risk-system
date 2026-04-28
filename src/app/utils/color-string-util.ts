export class ColorStringUtil {
        /**
         * Strips Warcraft 3 color tags like |cffRRGGBB or |cFFRRGGBB and |r from the text.
         */
        public static stripColorTags(text: string): string {
                let result = text;
                // A fast search to strip Warcraft 3 color tags like |cffRRGGBB or |cFFRRGGBB
                // W3 color tags are 10 characters long: |c + 8 hex digits
                while (true) {
                        const startStr = result.indexOf('|c');
                        const startStrAlt = result.indexOf('|C');
                        let c = -1;
                        if (startStr !== -1 && startStrAlt !== -1) c = Math.min(startStr, startStrAlt);
                        else if (startStr !== -1) c = startStr;
                        else if (startStrAlt !== -1) c = startStrAlt;

                        if (c !== -1 && c + 10 <= result.length) {
                                result = result.substring(0, c) + result.substring(c + 10);
                        } else {
                                break;
                        }
                }

                while (true) {
                        const rStr = result.indexOf('|r');
                        const rStrAlt = result.indexOf('|R');
                        let r = -1;
                        if (rStr !== -1 && rStrAlt !== -1) r = Math.min(rStr, rStrAlt);
                        else if (rStr !== -1) r = rStr;
                        else if (rStrAlt !== -1) r = rStrAlt;

                        if (r !== -1) {
                                result = result.substring(0, r) + result.substring(r + 2);
                        } else {
                                break;
                        }
                }

                return result;
        }

        /**
         * Returns the number of visible characters, stripping |cFFRRGGBB (10 chars) and |r (2 chars)
         */
        public static visibleLength(text: string): number {
                let overhead = 0;
                let i = 0;
                while (i < text.length) {
                        if (text.charAt(i) === '|' && i + 1 < text.length) {
                                const next = text.charAt(i + 1);
                                if (next === 'c' || next === 'C') {
                                        overhead += 10;
                                        i += 10;
                                } else if (next === 'r' || next === 'R') {
                                        overhead += 2;
                                        i += 2;
                                } else {
                                        i++;
                                }
                        } else {
                                i++;
                        }
                }
                return text.length - overhead;
        }
}
