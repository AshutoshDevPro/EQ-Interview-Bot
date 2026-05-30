import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_PERFORMANCE_DATA, SKILL_radar_DATA } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="glass-panel border-white/10 bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Progress Over Time</CardTitle>
          <CardDescription>Mock Interview Scores & Confidence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10 bg-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Skill Analysis</CardTitle>
          <CardDescription>Based on your last 5 sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={SKILL_radar_DATA}>
                <PolarGrid stroke="#ffffff20" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff80', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar
                  name="My Performance"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <RechartsTooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
