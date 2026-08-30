variable "tenancy_ocid" {
  description = "OCID of the OCI tenancy."
  type        = string
}

variable "compartment_ocid" {
  description = "OCID of the compartment that owns the Kurage resources."
  type        = string
}

variable "region" {
  description = "OCI region, for example sa-saopaulo-1."
  type        = string
}

variable "availability_domain_index" {
  description = "Availability domain index. Change it when A1 capacity is unavailable in the first AD."
  type        = number
  default     = 0

  validation {
    condition     = var.availability_domain_index >= 0
    error_message = "availability_domain_index must be zero or greater."
  }
}

variable "ssh_public_key" {
  description = "OpenSSH public key authorized for the kurage deployment user."
  type        = string

  validation {
    condition     = can(regex("^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp)", trimspace(var.ssh_public_key)))
    error_message = "ssh_public_key must be a valid OpenSSH public key."
  }
}

variable "ssh_allowed_cidr" {
  description = "Trusted public CIDR used when GitHub-hosted SSH deployment is disabled. Never use 0.0.0.0/0."
  type        = string

  validation {
    condition     = can(cidrnetmask(var.ssh_allowed_cidr)) && var.ssh_allowed_cidr != "0.0.0.0/0" && var.ssh_allowed_cidr != "::/0"
    error_message = "ssh_allowed_cidr must be a valid, restricted CIDR and cannot allow the entire internet."
  }
}

variable "allow_github_hosted_ssh_deploy" {
  description = "Expose key-only SSH to dynamic GitHub-hosted runners. Disable after moving deploys to a private/self-hosted runner or tunnel."
  type        = bool
  default     = true
}

variable "instance_shape" {
  description = "OCI compute shape. The default is the ARM64 Always Free shape."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Number of OCPUs assigned to the flexible instance."
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "Memory assigned to the flexible instance in GB."
  type        = number
  default     = 6
}

variable "boot_volume_size_gb" {
  description = "Boot volume size in GB."
  type        = number
  default     = 50

  validation {
    condition     = var.boot_volume_size_gb >= 50
    error_message = "OCI boot volumes must be at least 50 GB."
  }
}

variable "api_domain" {
  description = "Public API hostname."
  type        = string
  default     = "api.caiomayan.com"
}

variable "frontend_domain" {
  description = "Public frontend hostname hosted by Vercel."
  type        = string
  default     = "kurage.caiomayan.com"
}

variable "project_name" {
  description = "Short resource-name prefix."
  type        = string
  default     = "kurage-alpha"
}
