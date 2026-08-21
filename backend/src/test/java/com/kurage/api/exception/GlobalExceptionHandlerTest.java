package com.kurage.api.exception;

import com.kurage.api.controller.TeamController;
import com.kurage.api.controller.UserController;
import com.kurage.api.service.TeamService;
import com.kurage.api.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private TeamService teamService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        teamService = mock(TeamService.class);
        UserService userService = mock(UserService.class);
        com.kurage.api.service.ProfileVisitService profileVisitService = mock(com.kurage.api.service.ProfileVisitService.class);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new TeamController(teamService), new UserController(userService, profileVisitService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void preservesStatusAndReasonFromResponseStatusException() throws Exception {
        when(teamService.getTeamByName("does-not-exist"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado"));

        mockMvc.perform(get("/teams/name/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Time não encontrado"));
    }

    @Test
    void returnsBadRequestWhenRequiredQueryParameterIsMissing() throws Exception {
        mockMvc.perform(get("/users/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Parâmetro obrigatório ausente: q"));
    }
}
