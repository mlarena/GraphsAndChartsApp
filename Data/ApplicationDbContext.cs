using Microsoft.EntityFrameworkCore;
using GraphsAndChartsApp.Models;
using GraphsAndChartsApp.ViewModels;

namespace GraphsAndChartsApp.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<MonitoringPost> MonitoringPosts { get; set; }
        public DbSet<SensorType> SensorTypes { get; set; }
        public DbSet<Sensor> Sensors { get; set; }
        public DbSet<DOVMeasurementViewModel> DOVMeasurements { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Просто указываем схему без миграций
            modelBuilder.HasDefaultSchema("public");
            
           modelBuilder.Entity<DOVMeasurementViewModel>(entity =>
            {
                entity.HasNoKey();
                entity.ToView("vw_dov_data_full");
                
                entity.Property(e => e.DovDataId).HasColumnName("dov_data_id");
                entity.Property(e => e.DataTimestamp).HasColumnName("data_timestamp");
                entity.Property(e => e.VisibleRange).HasColumnName("visible_range");
                entity.Property(e => e.BrightFlag).HasColumnName("bright_flag");
                entity.Property(e => e.SensorId).HasColumnName("sensor_id");
                entity.Property(e => e.SerialNumber).HasColumnName("serial_number");
                entity.Property(e => e.EndpointName).HasColumnName("endpoint_name");
            });
        }
    }
}