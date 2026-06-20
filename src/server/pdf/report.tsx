import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { RoomSnapshot } from "@/types/quiz";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    color: "#233044",
    backgroundColor: "#fffaf4",
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 6,
    color: "#5c45a8",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 24,
    color: "#65708a",
  },
  section: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  heading: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
    color: "#32265f",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee8ff",
    paddingVertical: 6,
  },
  badge: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: "#e8fff9",
    color: "#356f64",
  },
});

function ReportDocument({ snapshot }: { snapshot: RoomSnapshot }) {
  const winner = snapshot.leaderboard[0];

  return (
    <Document title={`QuizRush ${snapshot.room.code} Results`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>QuizRush Results</Text>
        <Text style={styles.subtitle}>
          Room {snapshot.room.code} · {snapshot.players.length} participants · Powered by Valkey
        </Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Winner</Text>
          <Text>
            {winner ? `${winner.username} finished #1 with ${winner.score} points.` : "No winner yet."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Leaderboard</Text>
          {snapshot.leaderboard.map((entry) => (
            <View style={styles.row} key={entry.id}>
              <Text>
                #{entry.rank} {entry.username}
              </Text>
              <Text>{entry.score} pts</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Latest Analytics</Text>
          {snapshot.insights.map((insight) => (
            <Text key={`${insight.agent}-${insight.message}`} style={{ marginBottom: 6 }}>
              {insight.agent}: {insight.message}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Valkey Proof Trail</Text>
          {snapshot.events.slice(0, 12).map((event) => (
            <View style={styles.row} key={event.id}>
              <Text>{event.message}</Text>
              <Text style={styles.badge}>{event.primitive}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderResultsPdf(snapshot: RoomSnapshot) {
  return renderToBuffer(<ReportDocument snapshot={snapshot} />);
}
