package com.citable.backend.service;

import com.citable.backend.domain.Audit;
import com.citable.backend.domain.Organization;
import com.citable.backend.domain.Website;
import com.citable.backend.repository.AuditRepository;
import com.citable.backend.repository.OrganizationRepository;
import com.citable.backend.repository.WebsiteRepository;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisibilityService {

    private final OrganizationRepository organizationRepository;
    private final WebsiteRepository websiteRepository;
    private final AuditRepository auditRepository;

    public VisibilityService(
        OrganizationRepository organizationRepository,
        WebsiteRepository websiteRepository,
        AuditRepository auditRepository
    ) {
        this.organizationRepository = organizationRepository;
        this.websiteRepository = websiteRepository;
        this.auditRepository = auditRepository;
    }

    @Transactional
    public Map<String, Object> runDemoAudit(String domain) {
        Organization organization = organizationRepository.save(new Organization("Acme Commerce", "acme-commerce"));
        Website website = websiteRepository.save(new Website(organization, domain));
        Audit audit = auditRepository.save(new Audit(website));

        audit.setVisibilityScore(82);
        audit.setStatus("COMPLETED");

        return Map.of(
            "organizationId", organization.getId(),
            "websiteId", website.getId(),
            "auditId", audit.getId(),
            "score", audit.getVisibilityScore(),
            "status", audit.getStatus(),
            "message", "Citable visibility audit completed for " + domain
        );
    }
}
