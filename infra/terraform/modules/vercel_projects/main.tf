terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "0.14.0"
    }
  }
}

variable "team_id" {
  type = string
}

variable "projects" {
  type = list(object({
    name        = string
    framework   = string
    environment = string
  }))
}

resource "vercel_project" "this" {
  for_each   = { for project in var.projects : project.name => project }
  name       = each.value.name
  framework  = each.value.framework
  team_id    = var.team_id
  git_repository {
    type = "github"
  }
}
