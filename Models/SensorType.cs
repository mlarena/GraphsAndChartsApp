using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GraphsAndChartsApp.Models
{
    [Table("SensorType", Schema = "public")]
    public class SensorType
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("SensorTypeName", TypeName = "varchar(20)")]
        [MaxLength(20)]
        public string SensorTypeName { get; set; } = string.Empty;

        [Required]
        [Column("Description")]
        public string Description { get; set; } = string.Empty;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Sensor> Sensors { get; set; } = new List<Sensor>();
    }
}