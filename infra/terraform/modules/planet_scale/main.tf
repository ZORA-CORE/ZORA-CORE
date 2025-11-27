terraform {
  required_providers {
    planetscale = {
      source  = "planetscale/planetscale"
      version = "0.7.0"
    }
  }
}

variable "org" {
  type = string
}

variable "databases" {
  type = list(object({
    name    = string
    region  = string
    branch  = string
  }))
}

resource "planetscale_database" "this" {
  for_each = { for db in var.databases : db.name => db }
  organization = var.org
  name         = each.value.name
  region       = each.value.region
}

resource "planetscale_branch" "branch" {
  for_each = { for db in var.databases : db.name => db }
  organization = var.org
  database     = planetscale_database.this[each.key].name
  name         = each.value.branch
}
