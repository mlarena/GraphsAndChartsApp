using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GraphsAndChartsApp.Models
{
    [Table("Sensor", Schema = "public")]
    public class Sensor
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Column("SensorTypeId")]
        public int SensorTypeId { get; set; }

        [Column("MonitoringPostId")]
        public int? MonitoringPostId { get; set; }

        [Column("Longitude")]
        public double? Longitude { get; set; }

        [Column("Latitude")]
        public double? Latitude { get; set; }

        [Required]
        [Column("SerialNumber", TypeName = "varchar(64)")]
        [MaxLength(64)]
        public string SerialNumber { get; set; } = string.Empty;

        [Required]
        [Column("EndPointsName", TypeName = "varchar(255)")]
        [MaxLength(255)]
        public string EndPointsName { get; set; } = string.Empty;

        [Required]
        [Column("Url")]
        public string Url { get; set; } = string.Empty;

        [Column("CheckIntervalSeconds")]
        public int CheckIntervalSeconds { get; set; } = 300;

        [Column("LastActivityUTC")]
        public DateTime? LastActivityUTC { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [ForeignKey("SensorTypeId")]
        public virtual SensorType? SensorType { get; set; }

        [ForeignKey("MonitoringPostId")]
        public virtual MonitoringPost? MonitoringPost { get; set; }
    }
}