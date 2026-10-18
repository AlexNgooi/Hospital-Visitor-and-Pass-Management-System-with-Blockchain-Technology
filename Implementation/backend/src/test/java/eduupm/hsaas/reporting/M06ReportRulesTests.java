package eduupm.hsaas.reporting;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import eduupm.hsaas.common.ApiFailure;

/** Focused security/date checks cover CSV formula execution and the MYT midnight boundary, without starting any service. */
class M06ReportRulesTests {
    @Test void mytCalendarRangeIsUtcHalfOpenAndIndependentOfHostTimezone(){
        var query=new LinkedMultiValueMap<String,String>();query.add("from","2026-10-18");query.add("to","2026-10-18");
        var filter=ReportFilter.parse(query,Clock.systemUTC());
        assertEquals(LocalDateTime.parse("2026-10-17T16:00:00"),filter.start());
        assertEquals(LocalDateTime.parse("2026-10-18T16:00:00"),filter.end());
    }
    @Test void defaultDateChangesAtMytMidnightRatherThanUtcMidnight(){
        var query=new LinkedMultiValueMap<String,String>();
        assertEquals(LocalDate.parse("2026-10-18"),ReportFilter.parse(query,Clock.fixed(Instant.parse("2026-10-18T15:59:59Z"),ZoneOffset.UTC)).from());
        assertEquals(LocalDate.parse("2026-10-19"),ReportFilter.parse(query,Clock.fixed(Instant.parse("2026-10-18T16:00:00Z"),ZoneOffset.UTC)).from());
    }
    @Test void duplicateUnknownAndExcessiveRangesAreRejected(){
        var query=new LinkedMultiValueMap<String,String>();query.add("from","2026-10-18");query.add("from","2026-10-17");
        assertThrows(ApiFailure.class,()->ReportFilter.parse(query,Clock.systemUTC()));
        query.clear();query.add("actorId","1");assertThrows(ApiFailure.class,()->ReportFilter.parse(query,Clock.systemUTC()));
        query.clear();query.add("from","2025-01-01");query.add("to","2026-01-02");assertThrows(ApiFailure.class,()->ReportFilter.parse(query,Clock.systemUTC()));
    }
    @Test void formulaPrefixesWhitespaceAndQuotesAreNeutralized(){
        for(String value:new String[]{"=1+1","+SUM(A1)","-2+1","@cmd"," \t=HYPERLINK(\"x\")","\u00a0\ufeff=1","\ntext","\ttext"})assertTrue(CsvSafety.cell(value).startsWith("\"'"));
        assertEquals("\"Ward \"\"A\"\", Level 1\"",CsvSafety.cell("Ward \"A\", Level 1"));
        assertEquals("\"safe\",\"***\"\r\n",CsvSafety.row("safe","***"));
    }
}
