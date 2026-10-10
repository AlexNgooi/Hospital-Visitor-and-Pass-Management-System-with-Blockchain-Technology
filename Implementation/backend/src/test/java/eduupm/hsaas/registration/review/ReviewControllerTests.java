package eduupm.hsaas.registration.review;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.registration.RegistrationReadPort;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Standalone servlet binding tests only; mock services omit the actual security/CSRF/JDBC chain and prove no real HTTP acceptance. */
class ReviewControllerTests {
    private final ReviewService commands = mock(ReviewService.class);
    private final ReviewReadService reads = mock(ReviewReadService.class);
    private final MockHttpSession session = new MockHttpSession();
    private final ReviewService.StaffContext context = new ReviewService.StaffContext("server-binding", "server-owner", 1L, "staff");
    private MockMvc mvc;

    @BeforeEach void configure() {
        session.setAttribute(SessionCapabilities.BINDING, context.bindingId()); session.setAttribute(SessionCapabilities.CONTEXT, context.ownerContextId());
        session.setAttribute(SessionCapabilities.GENERATION, context.generation());
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("staff", null,
                List.of(new SimpleGrantedAuthority("ROLE_COUNTER_STAFF"))));
        mvc = MockMvcBuilders.standaloneSetup(new ReviewController(commands, reads)).build();
    }
    @AfterEach void clearPrincipal() { SecurityContextHolder.clearContext(); }

    /** Spring request binding must retain both counter selections so ReviewQueries can reject ambiguity instead of last-value wins. */
    @Test void queueServletBindingPreservesDuplicateParameters() throws Exception {
        when(reads.queue(eq(context), anyMap())).thenAnswer(call -> {
            Map<String, List<String>> parameters = call.getArgument(1);
            assertThat(parameters.get("counterId")).containsExactly("2", "3");
            return new RegistrationReadPort.QueuePage(List.of(), 0, 0, 10, "2026-10-10T00:00:00Z");
        });
        mvc.perform(get("/api/staff/registrations").session(session).param("counterId", "2", "3"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Referrer-Policy", "no-referrer")).andExpect(jsonPath("$.pageSize").value(10));
        verify(reads).queue(eq(context), anyMap()); verifyNoInteractions(commands);
    }
    /** New GET transport factoring preserves POST raw strict parsing, original key and actual session coordinates. */
    @Test void postForwardsOriginalHandleAndServerContext() throws Exception {
        String key = "89f189ca-a2dc-473b-bcdc-c51a22be9d04", body = "{\"expectedVersion\":0,\"reasonCode\":\"INFORMATION_INCOMPLETE\"}";
        when(commands.reject(context, "1", key, body)).thenReturn(new IdempotencyPort.SafeResult("1", "R-TEST-001", "REJECTED", 1));
        mvc.perform(post("/api/staff/registrations/1/reject").session(session).header("Idempotency-Key", key)
                .contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.status").value("REJECTED"));
        verify(commands).reject(context, "1", key, body); verifyNoInteractions(reads);
    }
}
