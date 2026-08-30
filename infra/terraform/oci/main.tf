data "oci_identity_availability_domains" "available" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu_arm64" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  availability_domain = data.oci_identity_availability_domains.available.availability_domains[var.availability_domain_index].name
  cloudflare_ipv4_cidrs = toset([
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ])
  common_tags = {
    Application = "Kurage"
    Environment = "alpha"
    ManagedBy   = "Terraform"
  }
}

resource "oci_core_vcn" "kurage" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.20.0.0/16"]
  display_name   = "${var.project_name}-vcn"
  dns_label      = "kurage"
  freeform_tags  = local.common_tags
}

resource "oci_core_internet_gateway" "kurage" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.kurage.id
  display_name   = "${var.project_name}-internet-gateway"
  enabled        = true
  freeform_tags  = local.common_tags
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.kurage.id
  display_name   = "${var.project_name}-public-routes"
  freeform_tags  = local.common_tags

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.kurage.id
  }
}

resource "oci_core_security_list" "public_subnet" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.kurage.id
  display_name   = "${var.project_name}-subnet-security"
  freeform_tags  = local.common_tags

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.kurage.id
  cidr_block                 = "10.20.10.0/24"
  display_name               = "${var.project_name}-public-subnet"
  dns_label                  = "api"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public_subnet.id]
  prohibit_public_ip_on_vnic = false
  freeform_tags              = local.common_tags
}

resource "oci_core_network_security_group" "backend" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.kurage.id
  display_name   = "${var.project_name}-backend-nsg"
  freeform_tags  = local.common_tags
}

resource "oci_core_network_security_group_security_rule" "ssh" {
  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.allow_github_hosted_ssh_deploy ? "0.0.0.0/0" : var.ssh_allowed_cidr
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_network_security_group_security_rule" "http" {
  for_each = local.cloudflare_ipv4_cidrs

  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = each.value
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "https" {
  for_each = local.cloudflare_ipv4_cidrs

  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = each.value
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "egress" {
  network_security_group_id = oci_core_network_security_group.backend.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

resource "oci_core_instance" "backend" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "${var.project_name}-backend"
  shape               = var.instance_shape
  freeform_tags       = local.common_tags

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    assign_public_ip = false
    display_name     = "${var.project_name}-backend-vnic"
    hostname_label   = "backend"
    nsg_ids          = [oci_core_network_security_group.backend.id]
    subnet_id        = oci_core_subnet.public.id
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm64.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_gb
    boot_volume_vpus_per_gb = 10
  }

  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  metadata = {
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", {
      ssh_public_key = trimspace(var.ssh_public_key)
    }))
  }

  lifecycle {
    precondition {
      condition     = length(data.oci_core_images.ubuntu_arm64.images) > 0
      error_message = "No compatible Ubuntu 24.04 ARM64 image was found for the selected shape and region."
    }
  }
}

data "oci_core_vnic_attachments" "backend" {
  compartment_id = var.compartment_ocid
  instance_id    = oci_core_instance.backend.id
}

data "oci_core_vnic" "backend" {
  vnic_id = data.oci_core_vnic_attachments.backend.vnic_attachments[0].vnic_id
}

data "oci_core_private_ips" "backend" {
  vnic_id = data.oci_core_vnic.backend.id
}

resource "oci_core_public_ip" "backend" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project_name}-backend-public-ip"
  lifetime       = "RESERVED"
  private_ip_id  = data.oci_core_private_ips.backend.private_ips[0].id
  freeform_tags  = local.common_tags
}
