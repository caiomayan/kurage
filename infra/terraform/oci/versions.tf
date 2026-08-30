terraform {
  required_version = ">= 1.12.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 8.0"
    }
  }

  # Configured at init time by the GitHub Actions workflow. Keeping credentials
  # out of this block prevents them from being committed with the repository.
  backend "oci" {}
}

provider "oci" {
  region = var.region
}
