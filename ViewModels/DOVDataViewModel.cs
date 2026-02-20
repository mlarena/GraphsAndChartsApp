using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.ViewModels
{
    public class DOVDataViewModel
    {
        public int SensorId { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public string EndpointName { get; set; } = string.Empty;
        public string? PostName { get; set; }
        public List<DOVMeasurementViewModel> Measurements { get; set; } = new List<DOVMeasurementViewModel>();
    }

    public class DOVMeasurementViewModel
    {
        public int DovDataId { get; set; }
        public DateTime DataTimestamp { get; set; }
        public decimal VisibleRange { get; set; }
        public int BrightFlag { get; set; }
        
        // Эти поля не нужны для графиков, но могут быть полезны для других целей
        public int? SensorId { get; set; }
        public string? SerialNumber { get; set; }
        public string? EndpointName { get; set; }
    }
}