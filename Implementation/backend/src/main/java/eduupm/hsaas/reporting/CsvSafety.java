package eduupm.hsaas.reporting;

/** Quotes every CSV field and neutralizes formulas even when preceded by spreadsheet-ignored whitespace. */
public final class CsvSafety {
    private CsvSafety() { }
    public static String cell(String value) {
        String safe=value==null?"":value.replace('\u0000',' ');
        int start=0;
        while(start<safe.length()) {
            int character=safe.codePointAt(start);
            if(character>32 && !Character.isWhitespace(character) && !Character.isSpaceChar(character) && Character.getType(character)!=Character.FORMAT)break;
            start+=Character.charCount(character);
        }
        String probe=safe.substring(start);
        if(!probe.isEmpty() && "=+-@".indexOf(probe.charAt(0))>=0 || safe.startsWith("\t") || safe.startsWith("\r") || safe.startsWith("\n"))safe="'"+safe;
        return "\""+safe.replace("\"","\"\"")+"\"";
    }
    public static String row(String... values){return java.util.Arrays.stream(values).map(CsvSafety::cell).collect(java.util.stream.Collectors.joining(","))+"\r\n";}
}
