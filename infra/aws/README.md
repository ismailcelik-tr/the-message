# AWS Production Deployment Architecture Strategy

This guide describes how the "Çağrı (The Message)" backend and database will be deployed to Amazon Web Services (AWS) in the production phase.

---

## 1. High-Level Architecture Overview

```
                      +-----------------------------+
                      |       Users / Mobile        |
                      +--------------+--------------+
                                     |
                                     v HTTPS (Port 443)
                      +--------------+--------------+
                      |   Route 53 DNS Resolution   |
                      +--------------+--------------+
                                     |
                                     v
                      +--------------+--------------+
                      |  Application Load Balancer  |
                      +--------------+--------------+
                                     |
                +--------------------+--------------------+
                | (Private Subnet 1)                      | (Private Subnet 2)
                v                                         v
+---------------+---------------+         +---------------+---------------+
| ECS Fargate (API App Instance)|         | ECS Fargate (API App Instance)|
+---------------+---------------+         +---------------+---------------+
                |                                         |
                +--------------------+--------------------+
                                     | (Internal TCP 5432)
                                     v
                      +--------------+--------------+
                      |   Amazon RDS PostgreSQL     |
                      |   (Multi-AZ Replication)    |
                      +-----------------------------+
```

---

## 2. Component Breakdown

### A. Compute: AWS Elastic Container Service (ECS) on Fargate
- **Why**: Serverless container orchestration. No EC2 servers to provision, patch, or maintain.
- **Dockerization**: The production multi-stage build from `infra/docker/Dockerfile.api` is compiled and pushed to **Amazon Elastic Container Registry (ECR)**.
- **Auto-scaling**: Automatically scales container tasks up or down based on CPU/Memory usage metrics.
- **Environment Management**: Parameters and secrets loaded safely into containers via AWS Systems Manager Parameter Store or Secrets Manager.

### B. Database: Amazon Relational Database Service (RDS) for PostgreSQL
- **Why**: Highly available, automated backups, and minor engine upgrades.
- **High Availability**: Multi-AZ (Active-Standby replication across Availability Zones) to prevent data loss or server downtime.
- **Migrations**: TypeORM or Prisma schema migration CLI commands run within a short-lived ECS Task before rolling updates are deployed to prevent DB sync issues.

### C. Networking & Security
- **VPC Configuration**: 
  - **Public Subnets**: Houses the Application Load Balancer (ALB) and NAT Gateways.
  - **Private Subnets**: Houses ECS Fargate containers (with no direct internet ingress) and the RDS database.
- **Application Load Balancer (ALB)**: Decrypts SSL/TLS certificates (managed automatically by AWS Certificate Manager) and routes requests to active ECS target groups.
- **Security Groups**: Tight firewall rules blocking traffic to the database except from the API Security Group.

---

## 3. Production Deployment Pipeline

An automated CI/CD flow using **GitHub Actions**:
1. **Push to main**: Starts the pipeline.
2. **Test & Lint**: Runs code verification tests.
3. **Docker Build**: Builds the production target container.
4. **ECR Push**: Tags and registers the image in Amazon ECR.
5. **ECS Deploy**: Triggers a rolling deployment update on the ECS Service.
