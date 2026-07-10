# Agency Project Initialization Script
# Usage: .agency/scripts/init-project.ps1 -ProjectName "MyProject"

param(
    [string]$ProjectName = $(Read-Host "Project name"),
    [string]$ProjectType = "monorepo",
    [string]$FrontendFramework = "react",
    [string]$FrontendSource = "apps/web/src",
    [string]$MobileFramework = "react-native",
    [string]$MobileSource = "apps/mobile/src",
    [string]$BackendFramework = "nestjs",
    [string]$BackendSource = "apps/api/src",
    [string]$DatabaseSource = "apps/api/prisma",
    [string]$DatabaseORM = "prisma",
    [string]$SharedSource = "packages/shared/src",
    [string]$PackageManager = "npm"
)

Write-Host "=== Agency Initialization ===" -ForegroundColor Cyan
Write-Host "Initializing project: $ProjectName" -ForegroundColor Yellow

# 1. Create .agency/config.json
$config = @{
    project = @{
        name = $ProjectName
        type = $ProjectType
        language = "typescript"
        packageManager = $PackageManager
    }
    principals = @{
        SENTINEL = $true
        TIME_TRAVEL = $true
        SOCRATIC = $true
        GROUNDING = $true
        SWARM = $true
        FEATURE_CREEP = $true
        UNIT_TEST = $true
        GIT_HANDSHAKE = $true
    }
    paths = @{
        frontendWeb = @{ source = $FrontendSource; framework = $FrontendFramework }
        frontendMobile = @{ source = $MobileSource; framework = $MobileFramework }
        backendLogic = @{ source = $BackendSource; framework = $BackendFramework }
        backendDatabase = @{ source = $DatabaseSource; orm = $DatabaseORM }
        shared = @{ source = $SharedSource }
        infrastructure = @{ scripts = "scripts"; ci = ".github" }
    }
    agents = @{
        orchestrator = "lead-architect"
        enabled = @(
            "lead-architect",
            "backend-lead", "backend-api", "backend-service", "backend-integration",
            "frontend-lead", "frontend-ui", "frontend-page", "frontend-state",
            "mobile-lead", "mobile-ui", "mobile-screen", "mobile-state",
            "devops-lead", "devops-infra", "devops-cicd", "devops-db",
            "documentarian", "qa-automator", "release-manager", "design-keeper",
            "compliance-guardian", "security-auditor", "performance-auditor",
            "accessibility-auditor"
        )
    }
}

$configJson = $config | ConvertTo-Json -Depth 10
Set-Content -Path ".agency/config.json" -Value $configJson -Force

Write-Host "✅ .agency/config.json created" -ForegroundColor Green

# 2. Generate .roo/modes/*.json from templates
$templatePath = ".agency/templates/agent-template.json"
if (Test-Path $templatePath) {
    $template = Get-Content $templatePath -Raw
    
    # Replace template variables
    $template = $template.Replace("{{FRONTEND_WEB_SOURCE}}", $FrontendSource)
    $template = $template.Replace("{{FRONTEND_MOBILE_SOURCE}}", $MobileSource)
    $template = $template.Replace("{{BACKEND_LOGIC_SOURCE}}", $BackendSource)
    $template = $template.Replace("{{BACKEND_DB_SOURCE}}", $DatabaseSource)
    $template = $template.Replace("{{SHARED_SOURCE}}", $SharedSource)
    $template = $template.Replace("{{PROJECT_NAME}}", $ProjectName)
    
    Write-Host "✅ Templates processed" -ForegroundColor Green
}

# 3. Create ORCHESTRATION.md
$orchBoard = @"
# Orchestration Board

**Project**: $ProjectName
**Sprint**: [Sprint 1]
**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")

## Active Tasks
| Task ID | Stage | Agent | Status | Blockers | Handoff To |
|---------|-------|-------|--------|----------|------------|
| T-001 | 1 - Planning | 🧠 Lead Architect | ⏳ PENDING | — | TBD |

## Status Legend
| Status | Meaning |
|--------|---------|
| ⏳ PENDING | Not yet started |
| 🔄 IN PROGRESS | Actively working |
| ✅ DONE | Completed and committed |
| ⏳ BLOCKED | Cannot proceed |
| ❌ FAILED | Gate failed |
"@

Set-Content -Path "ORCHESTRATION.md" -Value $orchBoard -Force
Write-Host "✅ ORCHESTRATION.md created" -ForegroundColor Green

# 4. Create .agency/contracts/ directory
New-Item -ItemType Directory -Force -Path ".agency/contracts" | Out-Null
Write-Host "✅ .agency/contracts/ directory created" -ForegroundColor Green

Write-Host ""
Write-Host "=== Agency initialization complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review .agency/config.json and update paths if needed"
Write-Host "2. Start sprint planning with 🧠 Lead Architect"
Write-Host "3. First feature: create .agency/contracts/<feature>.api.json"
