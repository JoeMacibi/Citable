package com.citable.backend.controller;

import com.citable.backend.service.VisibilityService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class VisibilityController {

    private final VisibilityService visibilityService;

    public VisibilityController(VisibilityService visibilityService) {
        this.visibilityService = visibilityService;
    }

    @PostMapping("/audits/run")
    public ResponseEntity<Map<String, Object>> runAudit(@RequestBody Map<String, String> request) {
        String domain = request.getOrDefault("domain", "https://example.com");
        return ResponseEntity.ok(visibilityService.runDemoAudit(domain));
    }
}
