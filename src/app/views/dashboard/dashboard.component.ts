import { Component, OnInit } from '@angular/core';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { AngularFireDatabase, listChanges } from '@angular/fire/database';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Component({
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  radioModel: string = 'Month';

  // first chart start

  public mainChartElements = 24;
  public mainChartData1: Array<number> = [];
  public mainChartData2: Array<number> = [];
  public mainChartData3: Array<number> = [];
  public mainChartData4: Array<number> = [];

  public mainChartData: Array<any> = [
    {
      data: this.mainChartData1,
      label: 'DC-POWER'
    },
    {
      data: this.mainChartData2,
      label: 'Predicted DC-POWER'
    },
    {
      data: this.mainChartData3,
      label: 'AC-POWER'
    },
    {
      data: this.mainChartData4,
      label: 'Predicted AC-POWER'
    },
  ];

  public mainChartLabels: string[] = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  public mainChartOptions: any = {
    tooltips: {
      enabled: false,
      custom: CustomTooltips,
      intersect: true,
      mode: 'index',
      position: 'nearest',
      callbacks: {
        labelColor: function (tooltipItem, chart) {
          return { backgroundColor: chart.data.datasets[tooltipItem.datasetIndex].borderColor };
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
        hoverBorderWidth: 3,
      }
    },
    legend: {
      display: false
    }
  };
  public mainChartColours: Array<any> = [
    { // brandInfo
      backgroundColor: hexToRgba(getStyle('--info'), 10),
      borderColor: getStyle('--info'),
      pointHoverBackgroundColor: '#fff'
    },
    { // brandSuccess
      backgroundColor: 'transparent',
      borderColor: getStyle('--success'),
      pointHoverBackgroundColor: '#fff'
    },
    { // brandDanger
      backgroundColor: hexToRgba(getStyle('--danger'), 10),
      borderColor: getStyle('--danger'),
      pointHoverBackgroundColor: '#fff',
    },
    {
      backgroundColor: 'transparent',
      borderColor: getStyle('--warning'),
      pointHoverBackgroundColor: '#fff',
    }
  ];
  public mainChartLegend = false;
  public mainChartType = 'line';
  // first chart End

  data = [] //DC power by time data
  xLableTimes = [] //Array of times in X label
  wheatherInfo = { values: [] } // Array of wheather info for today
  today = '2020-06-14' // today date
  url = 'http://127.0.0.1:5000/predict' //url into prediction model
  dcReal 
  dcPredicted
  acReal
  acPredicted
  modulePerformance = "good"
  inverterPerformance = "good"
  inverterEfficiency 
  weatherNow = {
    solarIrr : null ,
    ambientTemp : null ,
    moduleTemp : null,
    humidity : 21
  }

  constructor(private db: AngularFireDatabase, public http: HttpClient) {
    this.timepreparing()
  }

  timepreparing() {
    var x = 60; //minutes interval
    var tt = 0; // start time
    var time = new Date().getHours() //Now
    //loop to increment the time and push results in array
    for (var i = 0; tt <= time * 60; i++) {
      var hh = Math.floor(tt / 60); // getting hours of day in 0-24 format
      var mm = (tt % 60); // getting minutes of the hour in 0-55 format
      this.xLableTimes[i] = ("0" + (hh)).slice(-2) + ':' + ("0" + mm).slice(-2) + ":00"; // pushing data in array in [00:00:00] format
      tt = tt + x;
    }
  }

  ngOnInit(): void {
    this.getRealTimeData()
    this.getWheatherData()
  }

  getRealTimeData() {
    //Retriving real time data from firebase database
    const ref = this.db.list('gen', ref => ref.orderByChild("DATE").equalTo(this.today))
    ref.valueChanges().subscribe((data) => {
      for (let x of this.xLableTimes) {
        var result = data.find(res => {
          return res['TIME'] === x
        })
        this.data.push(result)
      }
      //Push data to data array
      for (let x of this.data) {
        this.mainChartData1.push(x.DC_POWER)
        this.mainChartData3.push(x.AC_POWER * 10)
      }
    })
  }

  getWheatherData() {
    //Retriving wheather info data from firebase database
    var t = ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00', '06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00', '23:00:00']
    var w = []
    const ref = this.db.list('sens', ref => ref.orderByChild("DATE").equalTo(this.today))
    ref.valueChanges().subscribe((data) => {
      for (let x of t) {
        var result = data.find(res => {
          return res['TIME'] === x
        })
        w.push(result)
      }
      w = w.map(({ DATE, FIELD1, TIME, ...rest }) => {
        return rest
      }) //dumping unwanted props
      for (let y = 0; y < w.length; y++) {
        var arr = []
        arr.push(w[y]['AMBIENT_TEMPERATURE'])
        arr.push(w[y]['MODULE_TEMPERATURE'])
        arr.push(w[y]['IRRADIATION'])
        this.wheatherInfo.values[y] = arr
      }
      var hour = new Date().getHours()
      this.weatherNow.ambientTemp =Math.floor(this.wheatherInfo.values[hour][0] * 10)/10
      this.weatherNow.moduleTemp =  Math.floor(this.wheatherInfo.values[hour][1] *10)/10
      this.weatherNow.solarIrr = Math.floor(this.wheatherInfo.values[hour][2] *1000)/1000

      console.log(this.wheatherInfo.values[hour])
      this.getPredictedGen()
    })
  }

  getPredictedGen() {
    return this.http.post<any>(this.url, this.wheatherInfo)
      .pipe().subscribe(data => {
        for (let x of data) {
          this.mainChartData2.push(x[0])
          this.mainChartData4.push(x[1] * 10)
        }
        this.healthCalculation()
      });
  }

  healthCalculation(){
    this.dcReal = Math.floor(this.mainChartData1[this.mainChartData1.length-1])
    this.dcPredicted = Math.floor(this.mainChartData2[this.mainChartData1.length-1])
    this.acReal = Math.floor(this.mainChartData3[this.mainChartData3.length-1])
    this.acPredicted = Math.floor(this.mainChartData4[this.mainChartData3.length-1])
    console.log(this.dcReal,this.acPredicted,this.acReal,this.dcPredicted)
    if((this.dcPredicted - this.dcReal)>= 2000) this.modulePerformance = "bad"

    if((this.acPredicted - this.acReal)>= 2000) this.inverterPerformance = "bad"

    this.inverterEfficiency = Math.floor(this.acReal*100/this.dcReal)
  }
}
