using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GraphsAndChartsApp.ViewModels
{
    public class SensorSelectionViewModel
    {
        public int? SelectedMonitoringPostId { get; set; }
        public int? SelectedSensorId { get; set; }
        public List<SelectListItem> MonitoringPosts { get; set; } = new List<SelectListItem>();
        public List<SelectListItem> Sensors { get; set; } = new List<SelectListItem>();
        public SensorViewModel? SelectedSensor { get; set; }
    }

    public class SensorViewModel
    {
        public int Id { get; set; }
        public string SensorTypeName { get; set; } = string.Empty;
        public string EndPointsName { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string? MonitoringPostName { get; set; }
        public string DisplayName => $"{SensorTypeName} {EndPointsName} {SerialNumber}";
    }
}