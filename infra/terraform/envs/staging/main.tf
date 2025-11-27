terraform {
  required_version = ">= 1.6.0"
  backend "remote" {}
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

provider "vercel" {
  api_token = var.vercel_token
  team      = var.vercel_team
}

module "dns" {
  source  = "../../modules/cloudflare_dns"
  zone_id = var.cloudflare_zone_id
  records = var.dns_records
}

module "zone_settings" {
  source  = "../../modules/cloudflare_zone_settings"
  zone_id = var.cloudflare_zone_id
}

module "vercel" {
  source  = "../../modules/vercel_projects"
  team_id = var.vercel_team
  projects = [
    { name = "zoracore-web-staging", framework = "nextjs", environment = "preview" },
    { name = "zoracore-admin-staging", framework = "nextjs", environment = "preview" }
  ]
}

module "planet_scale" {
  source = "../../modules/planet_scale"
  org    = var.planetscale_org
  databases = [
    { name = "zoracore-api-staging", region = "eu-west", branch = "staging" }
  ]
}

module "redis" {
  source   = "../../modules/upstash_redis"
  databases = [
    { name = "zoracore-rate-limit-staging", region = "eu" }
  ]
}

module "object_storage" {
  source     = "../../modules/object_storage"
  account_id = var.cloudflare_account_id
  buckets = [
    { name = "zoracore-media-staging", jurisdiction = "weur" }
  ]
}
