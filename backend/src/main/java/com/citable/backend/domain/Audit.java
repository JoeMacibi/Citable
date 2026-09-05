package com.citable.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "audits")
public class Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "website_id", nullable = false)
    private Website website;

    @Column(nullable = false)
    private String intent = "WEBSITE_VISIBILITY";

    @Column(nullable = false)
    private Integer visibilityScore = 0;

    @Column(nullable = false)
    private String status = "RUNNING";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Audit() {}

    public Audit(Website website) {
        this.website = website;
    }

    public Long getId() {
        return id;
    }

    public Website getWebsite() {
        return website;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public Integer getVisibilityScore() {
        return visibilityScore;
    }

    public void setVisibilityScore(Integer visibilityScore) {
        this.visibilityScore = visibilityScore;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
