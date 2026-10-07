# ADR-0009: Kubernetes everywhere, cloud-portable in three layers

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Dev on a MacBook, staging on a home lab, prod on cloud Kubernetes, with AWS, GCP and Azure all to remain possible.

## Decision

Same images everywhere. Staging runs k3s; prod runs EKS, GKE or AKS. Infrastructure is split into (1) OpenTofu modules per target with identical outputs, (2) portable cluster add-ons (Gateway API, cert-manager, ExternalDNS, External Secrets, NVIDIA GPU Operator, KEDA, Argo CD), (3) identical Helm charts with `base` / `env` / `cloud` values overlays. No managed glue services in the core. Images are multi-arch. Argo CD auto-syncs staging; prod updates by promotion.

## Consequences

- Cloud lock-in is confined to the OpenTofu layer and cloud overlays.
- Azure Blob needs a storage adapter (no S3 API).
- One primary prod cloud at a time; others kept deployable, not running.
