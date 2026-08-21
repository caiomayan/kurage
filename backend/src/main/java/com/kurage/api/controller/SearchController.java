package com.kurage.api.controller;

import com.kurage.api.dto.response.FullSearchResponse;
import com.kurage.api.dto.response.QuickSearchResponse;
import com.kurage.api.dto.response.SearchPlayerResult;
import com.kurage.api.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<QuickSearchResponse> quickSearch(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            @RequestParam(value = "limit", required = false, defaultValue = "8") int limit
    ) {
        QuickSearchResponse response = searchService.quickSearch(query, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/full")
    public ResponseEntity<FullSearchResponse> fullSearch(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            @RequestParam(value = "type", required = false, defaultValue = "ALL") String type,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "20") int size
    ) {
        FullSearchResponse response = searchService.fullSearch(query, type, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/players")
    public ResponseEntity<List<SearchPlayerResult>> searchPlayers(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            @RequestParam(value = "limit", required = false, defaultValue = "10") int limit
    ) {
        List<SearchPlayerResult> response = searchService.searchPlayersForInvite(query, limit);
        return ResponseEntity.ok(response);
    }
}
