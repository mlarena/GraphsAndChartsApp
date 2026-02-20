using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GraphsAndChartsApp.Models
{
    [Table("MonitoringPost", Schema = "public")]
    public class MonitoringPost
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("Name", TypeName = "varchar(255)")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("Description")]
        public string? Description { get; set; }

        [Column("Longitude")]
        public double? Longitude { get; set; }

        [Column("Latitude")]
        public double? Latitude { get; set; }

        [Column("IsMobile")]
        public bool IsMobile { get; set; } = false;

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Sensor> Sensors { get; set; } = new List<Sensor>();
    }
}